import {
  NativeDatePicker,
  NativeDecimalPicker,
  NativeEnumPicker,
  NativeIntPicker,
} from '@/components/NativePickers';
import { showApiError } from '@/lib/apiErrors';
import { useAuth } from '@/lib/AuthContext';
import { useTheme } from '@/lib/theme/ThemeContext';
import type { ThemeColors } from '@/lib/theme/tokens';
import { useThemedStyles } from '@/lib/theme/useThemedStyles';
import {
  dateToIso,
  DEFAULT_PROFILE_ROLE,
  formatProfileSaveError,
  getProfile,
  isProfileComplete,
  PROFILE_ROLE_OPTIONS,
  saveProfileFields,
  type ProfileRole,
} from '@/lib/profile';
import { useNavigation, useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  BackHandler,
  Button,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
const DEFAULT_DATE_OF_BIRTH = new Date(1990, 0, 15);

function parseProfileDate(value?: string): Date {
  if (!value) return DEFAULT_DATE_OF_BIRTH;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? DEFAULT_DATE_OF_BIRTH : parsed;
}

export default function OnboardingScreen() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const navigation = useNavigation();
  const styles = useThemedStyles(makeStyles);
  const { colors } = useTheme();
  const allowLeaveRef = useRef(false);
  const [profileComplete, setProfileComplete] = useState(false);
  const [username, setUsername] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState(DEFAULT_DATE_OF_BIRTH);
  const [bio, setBio] = useState('');
  const [country, setCountry] = useState('');
  const [height, setHeight] = useState(170);
  const [weight, setWeight] = useState(75);
  const [role, setRole] = useState<ProfileRole>(DEFAULT_PROFILE_ROLE);
  const [meals, setMeals] = useState('');
  const [targetKcal, setTargetKcal] = useState<number | null>(null);
  const [targetProtein, setTargetProtein] = useState<number | null>(null);
  const [targetCarbs, setTargetCarbs] = useState<number | null>(null);
  const [targetFat, setTargetFat] = useState<number | null>(null);
  const [dailyFluid, setDailyFluid] = useState<number | null>(null);
  const [tdee, setTdee] = useState<number | null>(null);
  const [goalPlain, setGoalPlain] = useState('');
  const [targetWeight, setTargetWeight] = useState<number | null>(null);
  const [weeklyDeficit, setWeeklyDeficit] = useState<number | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [saving, setSaving] = useState(false);
  const isRequired = !profileComplete;
const countryList = {
    "AF": "Afghanistan",
    "AL": "Albania",
    "DZ": "Algeria",
    "AS": "American Samoa",
    "AD": "Andorra",
    "AO": "Angola",
    "AI": "Anguilla",
    "AQ": "Antarctica",
    "AG": "Antigua and Barbuda",
    "AR": "Argentina",
    "AM": "Armenia",
    "AW": "Aruba",
    "AU": "Australia",
    "AT": "Austria",
    "AZ": "Azerbaijan",
    "BS": "Bahamas (the)",
    "BH": "Bahrain",
    "BD": "Bangladesh",
    "BB": "Barbados",
    "BY": "Belarus",
    "BE": "Belgium",
    "BZ": "Belize",
    "BJ": "Benin",
    "BM": "Bermuda",
    "BT": "Bhutan",
    "BO": "Bolivia (Plurinational State of)",
    "BQ": "Bonaire, Sint Eustatius and Saba",
    "BA": "Bosnia and Herzegovina",
    "BW": "Botswana",
    "BV": "Bouvet Island",
    "BR": "Brazil",
    "IO": "British Indian Ocean Territory (the)",
    "BN": "Brunei Darussalam",
    "BG": "Bulgaria",
    "BF": "Burkina Faso",
    "BI": "Burundi",
    "CV": "Cabo Verde",
    "KH": "Cambodia",
    "CM": "Cameroon",
    "CA": "Canada",
    "KY": "Cayman Islands (the)",
    "CF": "Central African Republic (the)",
    "TD": "Chad",
    "CL": "Chile",
    "CN": "China",
    "CX": "Christmas Island",
    "CC": "Cocos (Keeling) Islands (the)",
    "CO": "Colombia",
    "KM": "Comoros (the)",
    "CD": "Congo (the Democratic Republic of the)",
    "CG": "Congo (the)",
    "CK": "Cook Islands (the)",
    "CR": "Costa Rica",
    "HR": "Croatia",
    "CU": "Cuba",
    "CW": "Curaçao",
    "CY": "Cyprus",
    "CZ": "Czechia",
    "CI": "Côte d'Ivoire",
    "DK": "Denmark",
    "DJ": "Djibouti",
    "DM": "Dominica",
    "DO": "Dominican Republic (the)",
    "EC": "Ecuador",
    "EG": "Egypt",
    "SV": "El Salvador",
    "GQ": "Equatorial Guinea",
    "ER": "Eritrea",
    "EE": "Estonia",
    "SZ": "Eswatini",
    "ET": "Ethiopia",
    "FK": "Falkland Islands (the) [Malvinas]",
    "FO": "Faroe Islands (the)",
    "FJ": "Fiji",
    "FI": "Finland",
    "FR": "France",
    "GF": "French Guiana",
    "PF": "French Polynesia",
    "TF": "French Southern Territories (the)",
    "GA": "Gabon",
    "GM": "Gambia (the)",
    "GE": "Georgia",
    "DE": "Germany",
    "GH": "Ghana",
    "GI": "Gibraltar",
    "GR": "Greece",
    "GL": "Greenland",
    "GD": "Grenada",
    "GP": "Guadeloupe",
    "GU": "Guam",
    "GT": "Guatemala",
    "GG": "Guernsey",
    "GN": "Guinea",
    "GW": "Guinea-Bissau",
    "GY": "Guyana",
    "HT": "Haiti",
    "HM": "Heard Island and McDonald Islands",
    "VA": "Holy See (the)",
    "HN": "Honduras",
    "HK": "Hong Kong",
    "HU": "Hungary",
    "IS": "Iceland",
    "IN": "India",
    "ID": "Indonesia",
    "IR": "Iran (Islamic Republic of)",
    "IQ": "Iraq",
    "IE": "Ireland",
    "IM": "Isle of Man",
    "IL": "Israel",
    "IT": "Italy",
    "JM": "Jamaica",
    "JP": "Japan",
    "JE": "Jersey",
    "JO": "Jordan",
    "KZ": "Kazakhstan",
    "KE": "Kenya",
    "KI": "Kiribati",
    "KP": "Korea (the Democratic People's Republic of)",
    "KR": "Korea (the Republic of)",
    "KW": "Kuwait",
    "KG": "Kyrgyzstan",
    "LA": "Lao People's Democratic Republic (the)",
    "LV": "Latvia",
    "LB": "Lebanon",
    "LS": "Lesotho",
    "LR": "Liberia",
    "LY": "Libya",
    "LI": "Liechtenstein",
    "LT": "Lithuania",
    "LU": "Luxembourg",
    "MO": "Macao",
    "MG": "Madagascar",
    "MW": "Malawi",
    "MY": "Malaysia",
    "MV": "Maldives",
    "ML": "Mali",
    "MT": "Malta",
    "MH": "Marshall Islands (the)",
    "MQ": "Martinique",
    "MR": "Mauritania",
    "MU": "Mauritius",
    "YT": "Mayotte",
    "MX": "Mexico",
    "FM": "Micronesia (Federated States of)",
    "MD": "Moldova (the Republic of)",
    "MC": "Monaco",
    "MN": "Mongolia",
    "ME": "Montenegro",
    "MS": "Montserrat",
    "MA": "Morocco",
    "MZ": "Mozambique",
    "MM": "Myanmar",
    "NA": "Namibia",
    "NR": "Nauru",
    "NP": "Nepal",
    "NL": "Netherlands (the)",
    "NC": "New Caledonia",
    "NZ": "New Zealand",
    "NI": "Nicaragua",
    "NE": "Niger (the)",
    "NG": "Nigeria",
    "NU": "Niue",
    "NF": "Norfolk Island",
    "MP": "Northern Mariana Islands (the)",
    "NO": "Norway",
    "OM": "Oman",
    "PK": "Pakistan",
    "PW": "Palau",
    "PS": "Palestine, State of",
    "PA": "Panama",
    "PG": "Papua New Guinea",
    "PY": "Paraguay",
    "PE": "Peru",
    "PH": "Philippines (the)",
    "PN": "Pitcairn",
    "PL": "Poland",
    "PT": "Portugal",
    "PR": "Puerto Rico",
    "QA": "Qatar",
    "MK": "Republic of North Macedonia",
    "RO": "Romania",
    "RU": "Russian Federation (the)",
    "RW": "Rwanda",
    "RE": "Réunion",
    "BL": "Saint Barthélemy",
    "SH": "Saint Helena, Ascension and Tristan da Cunha",
    "KN": "Saint Kitts and Nevis",
    "LC": "Saint Lucia",
    "MF": "Saint Martin (French part)",
    "PM": "Saint Pierre and Miquelon",
    "VC": "Saint Vincent and the Grenadines",
    "WS": "Samoa",
    "SM": "San Marino",
    "ST": "Sao Tome and Principe",
    "SA": "Saudi Arabia",
    "SN": "Senegal",
    "RS": "Serbia",
    "SC": "Seychelles",
    "SL": "Sierra Leone",
    "SG": "Singapore",
    "SX": "Sint Maarten (Dutch part)",
    "SK": "Slovakia",
    "SI": "Slovenia",
    "SB": "Solomon Islands",
    "SO": "Somalia",
    "ZA": "South Africa",
    "GS": "South Georgia and the South Sandwich Islands",
    "SS": "South Sudan",
    "ES": "Spain",
    "LK": "Sri Lanka",
    "SD": "Sudan (the)",
    "SR": "Suriname",
    "SJ": "Svalbard and Jan Mayen",
    "SE": "Sweden",
    "CH": "Switzerland",
    "SY": "Syrian Arab Republic",
    "TW": "Taiwan",
    "TJ": "Tajikistan",
    "TZ": "Tanzania, United Republic of",
    "TH": "Thailand",
    "TL": "Timor-Leste",
    "TG": "Togo",
    "TK": "Tokelau",
    "TO": "Tonga",
    "TT": "Trinidad and Tobago",
    "TN": "Tunisia",
    "TR": "Turkey",
    "TM": "Turkmenistan",
    "TC": "Turks and Caicos Islands (the)",
    "TV": "Tuvalu",
    "UG": "Uganda",
    "UA": "Ukraine",
    "AE": "United Arab Emirates (the)",
    "GB": "United Kingdom of Great Britain and Northern Ireland (the)",
    "UM": "United States Minor Outlying Islands (the)",
    "US": "United States of America (the)",
    "UY": "Uruguay",
    "UZ": "Uzbekistan",
    "VU": "Vanuatu",
    "VE": "Venezuela (Bolivarian Republic of)",
    "VN": "Viet Nam",
    "VG": "Virgin Islands (British)",
    "VI": "Virgin Islands (U.S.)",
    "WF": "Wallis and Futuna",
    "EH": "Western Sahara",
    "YE": "Yemen",
    "ZM": "Zambia",
    "ZW": "Zimbabwe",
    "AX": "Åland Islands"
};
const countryOptions = Object.entries(countryList).map(([code, name]) => ({
  label: name,
  value: code,
}));

  useEffect(() => {
    if (!user && !loading) {
      router.push('/(tabs)/account');
    }
  }, [user, loading, router]);

  useEffect(() => {
    navigation.setOptions({
      gestureEnabled: !isRequired,
      headerBackVisible: !isRequired,
    });
  }, [isRequired, navigation]);

  useEffect(() => {
    if (!isRequired) return;

    const unsubscribe = navigation.addListener('beforeRemove', (event) => {
      if (allowLeaveRef.current) return;
      event.preventDefault();
      Alert.alert(
        'Profile required',
        'Finish setting up your profile before leaving this screen.',
      );
    });

    return unsubscribe;
  }, [isRequired, navigation]);

  useEffect(() => {
    if (!isRequired || Platform.OS !== 'android') return;

    const subscription = BackHandler.addEventListener('hardwareBackPress', () => true);
    return () => subscription.remove();
  }, [isRequired]);

  useEffect(() => {
    if (!user?.$id) {
      setLoadingProfile(false);
      return;
    }

    let active = true;

    getProfile(user.$id)
      .then((profile) => {
        if (!active) return;

        setProfileComplete(isProfileComplete(profile));
        if (!profile) return;

        setUsername(profile.username ?? '');
        setDateOfBirth(parseProfileDate(profile.dateOfBirth));
        setBio(profile.bio ?? '');
        setCountry(profile.country ?? '');
        setHeight(profile.height ?? 170);
        setWeight(profile.weight ?? 75);
        if (profile.role && PROFILE_ROLE_OPTIONS.includes(profile.role)) {
          setRole(profile.role);
        }
        setMeals(profile.meals ?? '');
        setTargetKcal(profile.target_kcal ?? null);
        setTargetProtein(profile.target_protein ?? null);
        setTargetCarbs(profile.target_carbs ?? null);
        setTargetFat(profile.target_fat ?? null);
        setDailyFluid(profile.daily_fluid ?? null);
        setTdee(profile.TDEE ?? null);
        setGoalPlain(profile.goal_plain ?? '');
        setTargetWeight(profile.target_weight ?? null);
        setWeeklyDeficit(profile.weekly_deficit ?? null);
      })
      .finally(() => {
        if (active) setLoadingProfile(false);
      });

    return () => {
      active = false;
    };
  }, [user?.$id]);

  async function handleSave() {
    if (!user?.$id || !user.email) {
      Alert.alert('Not signed in', 'Your account needs an email before saving a profile.');
      return;
    }

    if (!username.trim()) {
      Alert.alert('Missing details', 'Enter a username.');
      return;
    }

    if (username.trim().length > 64) {
      Alert.alert('Invalid username', 'Username must be 64 characters or fewer.');
      return;
    }

    if (bio.trim().length > 512) {
      Alert.alert('Invalid bio', 'Bio must be 512 characters or fewer.');
      return;
    }

    if (country.trim().length > 2) {
      Alert.alert('Invalid country', 'Use a 2-letter country code (e.g. US).');
      return;
    }

    setSaving(true);
    try {
      await saveProfileFields(user.$id, {
        username: username.trim(),
        email: user.email,
        dateOfBirth: dateToIso(dateOfBirth),
        height,
        weight,
        role,
        lastLogin: new Date().toISOString(),
        bio: bio.trim() || null,
        country: country.trim().toUpperCase() || null,
        meals: meals.trim() || null,
        target_kcal: targetKcal,
        target_protein: targetProtein,
        target_carbs: targetCarbs,
        target_fat: targetFat,
        daily_fluid: dailyFluid,
        TDEE: tdee,
        goal_plain: goalPlain.trim() || null,
        target_weight: targetWeight,
        weekly_deficit: weeklyDeficit,
      });
      allowLeaveRef.current = true;
      if (isRequired) {
        router.replace('/(tabs)/account');
      } else {
        router.back();
      }
    } catch (err) {
      showApiError(formatProfileSaveError(err), 'appwrite');
    } finally {
      setSaving(false);
    }
  }

  if (loading || loadingProfile) {
    return (
      <View style={styles.container}>
        <ActivityIndicator color={colors.accent} />
      </View>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
      <Button
        color={colors.accent}
        onPress={() => router.replace('/onboarding')}
        title="View the New & Improved Account Update Page"
        disabled={saving}
      />
      <Text style={styles.title}>Let's Learn More About You! (LEGACY VIEW)</Text>
      <Text style={styles.hint}>
        {isRequired
          ? 'Complete your profile to start using the app. All required fields must be saved.'
          : 'Email comes from your account. Timestamps and document id are managed by Appwrite.'}
      </Text>
      <Text style={styles.hint}>
        This page is kept around for legacy purposes. The new account update page is more user-friendly and has a better design. If you'd like to use this page, it's currently slated for removal in 3 major version releases.
      </Text>

      <Text style={styles.sectionTitle}>Account</Text>
      <Text style={styles.label}>Username</Text>
      <TextInput
        value={username}
        onChangeText={setUsername}
        placeholder="johndoe"
        placeholderTextColor={colors.textFaint}
        autoCapitalize="none"
        maxLength={64}
        style={styles.input}
      />

      <Text style={styles.label}>Email</Text>
      <TextInput
        value={user.email ?? ''}
        editable={false}
        style={[styles.input, styles.inputDisabled]}
      />

      <Text style={styles.label}>Date of birth</Text>
      <NativeDatePicker
        value={dateOfBirth}
        onChange={setDateOfBirth}
        disabled={saving}
        minimumDate={new Date(1900, 0, 1)}
        maximumDate={new Date()}
      />

      <Text style={styles.label}>Role</Text>
      <NativeEnumPicker
        value={role}
        options={PROFILE_ROLE_OPTIONS}
        onChange={setRole}
        disabled={saving}
      />

      <Text style={styles.label}>Bio</Text>
      <TextInput
        value={bio}
        onChangeText={setBio}
        placeholder="A short bio"
        placeholderTextColor={colors.textFaint}
        multiline
        maxLength={512}
        style={[styles.input, styles.multilineInput]}
      />

      <Text style={styles.label}>Country (2-letter code)</Text>
      <TextInput
        value={country}
        onChangeText={setCountry}
        placeholder="US"
        placeholderTextColor={colors.textFaint}
        autoCapitalize="characters"
        maxLength={2}
        style={styles.input}
      />
      <Text style={styles.label}>Country</Text>
      <NativeEnumPicker
        value={country}
        options={countryOptions} // Pass the mapped array here
        onChange={setCountry}
        disabled={saving}
      />
      <Text style={styles.sectionTitle}>Body</Text>
      <Text style={styles.label}>Height (cm)</Text>
      <NativeDecimalPicker
        value={height}
        onChange={setHeight}
        min={0}
        max={300}
        disabled={saving}
        unit="cm"
      />

      <Text style={styles.label}>Weight (kg)</Text>
      <NativeDecimalPicker
        value={weight}
        onChange={setWeight}
        min={0}
        max={1000}
        disabled={saving}
        unit="kg"
      />

      <Text style={styles.label}>Target weight (kg)</Text>
      <NativeIntPicker
        value={targetWeight}
        onChange={setTargetWeight}
        min={0}
        max={1000}
        optional
        disabled={saving}
        formatLabel={(value) => `${value} kg`}
      />

      <Text style={styles.sectionTitle}>Goals</Text>
      <Text style={styles.label}>Goal</Text>
      <TextInput
        value={goalPlain}
        onChangeText={setGoalPlain}
        placeholder="Lose 5 kg by summer"
        placeholderTextColor={colors.textFaint}
        multiline
        style={[styles.input, styles.multilineInput]}
      />

      <Text style={styles.label}>TDEE</Text>
      <NativeIntPicker
        value={tdee}
        onChange={setTdee}
        min={800}
        max={6000}
        step={10}
        optional
        disabled={saving}
      />

      <Text style={styles.label}>Weekly deficit</Text>
      <NativeIntPicker
        value={weeklyDeficit}
        onChange={setWeeklyDeficit}
        min={-10000}
        max={10000}
        step={50}
        optional
        disabled={saving}
        formatLabel={(value) => (value > 0 ? `+${value}` : String(value))}
      />

      <Text style={styles.sectionTitle}>Daily targets</Text>
      <Text style={styles.label}>Target kcal</Text>
      <NativeIntPicker
        value={targetKcal}
        onChange={setTargetKcal}
        min={800}
        max={6000}
        step={10}
        optional
        disabled={saving}
        formatLabel={(value) => `${value} kcal`}
      />

      <Text style={styles.label}>Target protein (g)</Text>
      <NativeIntPicker
        value={targetProtein}
        onChange={setTargetProtein}
        min={0}
        max={500}
        optional
        disabled={saving}
        formatLabel={(value) => `${value} g`}
      />

      <Text style={styles.label}>Target carbs (g)</Text>
      <NativeIntPicker
        value={targetCarbs}
        onChange={setTargetCarbs}
        min={0}
        max={1000}
        optional
        disabled={saving}
        formatLabel={(value) => `${value} g`}
      />

      <Text style={styles.label}>Target fat (g)</Text>
      <NativeIntPicker
        value={targetFat}
        onChange={setTargetFat}
        min={0}
        max={500}
        optional
        disabled={saving}
        formatLabel={(value) => `${value} g`}
      />

      <Text style={styles.label}>Daily fluid (ml)</Text>
      <NativeIntPicker
        value={dailyFluid}
        onChange={setDailyFluid}
        min={0}
        max={10000}
        step={50}
        optional
        disabled={saving}
        formatLabel={(value) => `${value} ml`}
      />

      <View style={styles.btnowner}>
        {!isRequired ? (
          <Pressable
            onPress={() => router.back()}
            disabled={saving}
            style={({ pressed }) => [styles.discardbtn, pressed && styles.discardbtnPressed]}
          >
            <Text style={styles.btnText}>Discard Details!</Text>
          </Pressable>
        ) : null}
        <Pressable
          onPress={handleSave}
          disabled={saving}
          style={({ pressed }) => [
            styles.btn,
            pressed && styles.btnPressed,
            saving && styles.btnDisabled,
          ]}
        >
          <Text style={styles.btnText}>{saving ? 'Saving…' : 'Save Details!'}</Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}

const makeStyles = (c: ThemeColors) => StyleSheet.create({
  scrollContent: {
    flexGrow: 1,
    backgroundColor: c.background,
    padding: 20,
    paddingBottom: 100,
  },
  container: {
    flex: 1,
    backgroundColor: c.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    color: c.text,
    fontSize: 22,
    fontWeight: '600',
    marginBottom: 8,
  },
  hint: {
    color: c.textFaint,
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 20,
  },
  sectionTitle: {
    color: c.accent,
    fontSize: 18,
    fontWeight: '600',
    marginTop: 8,
    marginBottom: 12,
  },
  label: {
    color: c.text,
    fontSize: 16,
    marginBottom: 6,
    width: '100%',
  },
  input: {
    backgroundColor: c.surfaceAlt,
    color: c.text,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 16,
    width: '100%',
    borderWidth: 1,
    borderColor: c.border,
  },
  inputDisabled: {
    opacity: 0.7,
  },
  multilineInput: {
    minHeight: 88,
    textAlignVertical: 'top',
  },
  btnowner: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    flexDirection: 'row',
    gap: 10,
  },
  btn: {
    backgroundColor: c.accent,
    borderRadius: 5,
    paddingVertical: 12,
    paddingHorizontal: 20,
  },
  btnPressed: {
    opacity: 0.85,
  },
  btnDisabled: {
    opacity: 0.5,
  },
  btnText: {
    textAlign: 'center',
    color: c.onAccent,
  },
  discardbtn: {
    backgroundColor: c.danger,
    borderRadius: 5,
    paddingVertical: 12,
    paddingHorizontal: 20,
  },
  discardbtnPressed: {
    opacity: 0.85,
  },
});
