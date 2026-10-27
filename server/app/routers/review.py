"""Small, private review portal for stored food contributions."""
import html
import json
from datetime import datetime, timedelta, timezone

import bcrypt
from fastapi import APIRouter, Depends, Form, HTTPException, Request
from fastapi.responses import HTMLResponse, RedirectResponse, Response
from jose import JWTError, jwt
from sqlalchemy.orm import Session

from app.config import settings
from app.database import get_db
from app.models import ContributionUpload, FoodContribution

router = APIRouter(tags=["review"])
ADMIN_USERNAME = "Admin"
# bcrypt hash for the sole configured password: 7ur2472b
ADMIN_PASSWORD_HASH = "$2b$12$6or.FeH.dzlBibjXA2.6qOHQNHOkdxJDwNAAnNupZQ.hoc93B1vr6"
COOKIE_NAME = "kiloric_review"
MACRO_FIELDS = ("energy_kcal_100g", "proteins_100g", "carbohydrates_100g", "fat_100g")


def _page(content: str, title: str = "Review", show_menu: bool = True) -> HTMLResponse:
    menu = (
        "<nav><a href='/review'>Review</a> | "
        "<form method='post' action='/review/logout' style='display:inline'><button>Log out</button></form></nav>"
        if show_menu else ""
    )
    return HTMLResponse(
        "<!doctype html><html><head><meta charset='utf-8'>"
        f"<title>{html.escape(title)}</title></head><body>{menu}<main>{content}</main></body></html>"
    )


def _is_admin(request: Request) -> bool:
    token = request.cookies.get(COOKIE_NAME)
    if not token:
        return False
    try:
        payload = jwt.decode(token, settings.JWT_SECRET, algorithms=[settings.JWT_ALGORITHM])
        return payload.get("sub") == ADMIN_USERNAME and payload.get("scope") == "review"
    except JWTError:
        return False


def _login_page(error: str = "") -> HTMLResponse:
    message = f"<p role='alert'>{html.escape(error)}</p>" if error else ""
    return _page(
        "<h1>Review login</h1>" + message +
        "<form method='post' action='/review/login'>"
        "<label>Username <input name='username' autocomplete='username' required></label><br>"
        "<label>Password <input name='password' type='password' autocomplete='current-password' required></label><br>"
        "<button type='submit'>Log in</button></form>", "Review login", show_menu=False
    )


@router.get("/review", response_class=HTMLResponse)
def review_home(request: Request, db: Session = Depends(get_db)):
    if not _is_admin(request):
        return _login_page()
    rows = db.query(FoodContribution).order_by(FoodContribution.created_at.desc()).all()
    if not rows:
        return _page("<h1>Food review</h1><p>No submissions yet.</p>")
    cards = []
    for row in rows:
        payload = json.loads(row.payload_json)
        product = html.escape(str(payload.get("product_name") or "Unnamed submission"))
        suggested = {key: payload.get(key) for key in (
            "energy_kcal_100g", "proteins_100g", "carbohydrates_100g", "fat_100g"
        ) if payload.get(key) not in (None, "")}
        user_macros = "<dl>" + "".join(
            f"<dt>{html.escape(key)}</dt><dd>{html.escape(str(value))}</dd>" for key, value in suggested.items()
        ) + "</dl>" if suggested else "<p>No macro suggestions supplied.</p>"
        reviewed = payload.get("admin_review") or {}
        accepted = reviewed.get("macros") or {}
        admin_macros = "<dl>" + "".join(
            f"<dt>{html.escape(key)}</dt><dd>{html.escape(str(value))}</dd>" for key, value in accepted.items()
        ) + "</dl>" if accepted else "<p>No admin update yet.</p>"
        file_ids = [payload.get(k) for k in (
            "photo_file_id", "front_file_id", "barcode_file_id", "ingredients_file_id", "nutrition_file_id"
        )]
        file_ids += payload.get("extra_file_ids") or []
        img_url = payload.get("image_url")
        if isinstance(img_url, str) and img_url.startswith("persistence-files://"):
            body = img_url[len("persistence-files://"):]
            for part in body.split(";"):
                if "=" in part:
                    _, val = part.split("=", 1)
                    file_ids.extend(val.split(","))
                else:
                    file_ids.extend(part.split(","))
        images = "".join(
            f"<figure><img src='/review/photos/{html.escape(str(fid), quote=True)}' "
            f"alt='Submitted food photo' style='max-width:320px;max-height:320px'>"
            f"<figcaption>{html.escape(str(fid))}</figcaption></figure>"
            for fid in dict.fromkeys(fid for fid in file_ids if isinstance(fid, str) and fid)
        )
        inputs = "".join(
            f"<label>{html.escape(name)} <input name='{name}' type='number' step='any' "
            f"value='{html.escape(str(accepted.get(name, suggested.get(name, ''))), quote=True)}'></label><br>"
            for name in MACRO_FIELDS
        )
        status = html.escape(str(reviewed.get("status") or "pending"))
        cards.append(
            f"<article><h2>{product}</h2><p>Submission {html.escape(row.id)} · {status}</p>"
            f"<section><h3>Submitted macro suggestions</h3>{user_macros}</section>"
            f"<section><h3>Admin reviewed macros</h3>{admin_macros}</section>"
            f"<section><h3>Photos</h3>{images or '<p>No photos attached.</p>'}</section>"
            f"<form method='post' action='/review/contributions/{html.escape(row.id, quote=True)}'>"
            f"<fieldset><legend>Update macros (per 100 g)</legend>{inputs}</fieldset>"
            "<button name='status' value='reviewed'>Save review</button></form></article><hr>"
        )
    return _page("<h1>Food review</h1>" + "".join(cards))


@router.post("/review/login")
def review_login(request: Request, username: str = Form(...), password: str = Form(...)):
    if username != ADMIN_USERNAME or not bcrypt.checkpw(password.encode("utf-8")[:72], ADMIN_PASSWORD_HASH.encode()):
        return _login_page("Invalid username or password.")
    token = jwt.encode(
        {"sub": ADMIN_USERNAME, "scope": "review", "exp": datetime.now(timezone.utc) + timedelta(hours=8)},
        settings.JWT_SECRET,
        algorithm=settings.JWT_ALGORITHM,
    )
    response = RedirectResponse("/review", status_code=303)
    response.set_cookie(COOKIE_NAME, token, httponly=True, secure=request.url.scheme == "https", samesite="strict", max_age=28800, path="/review")
    return response


@router.post("/review/logout")
def review_logout():
    response = RedirectResponse("/review", status_code=303)
    response.delete_cookie(COOKIE_NAME, path="/review")
    return response


@router.get("/review/photos/{file_id}")
def review_photo(file_id: str, request: Request, db: Session = Depends(get_db)):
    if not _is_admin(request):
        raise HTTPException(401, "Review login required.")
    row = db.get(ContributionUpload, file_id)
    if not row:
        raise HTTPException(404, "Photo not found.")
    return Response(row.content, media_type=row.content_type, headers={
        "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff"
    })


@router.post("/review/contributions/{record_id}")
async def update_review(
    record_id: str,
    request: Request,
    db: Session = Depends(get_db),
):
    if not _is_admin(request):
        raise HTTPException(401, "Review login required.")
    row = db.get(FoodContribution, record_id)
    if not row:
        raise HTTPException(404, "Submission not found.")
    form = await request.form()
    fields = ("energy_kcal_100g", "proteins_100g", "carbohydrates_100g", "fat_100g")
    macros = {}
    try:
        for name in fields:
            raw = str(form.get(name, "")).strip()
            if raw:
                number = float(raw)
                if not (number >= 0 and number < float("inf")):
                    raise ValueError()
                macros[name] = number
    except ValueError:
        raise HTTPException(422, "Macros must be finite, non-negative numbers.")
    payload = json.loads(row.payload_json)
    payload["admin_review"] = {
        "status": "reviewed",
        "macros": macros,
        "updated_at": datetime.now(timezone.utc).isoformat(),
    }
    row.payload_json = json.dumps(payload)
    db.commit()
    return RedirectResponse("/review", status_code=303)
