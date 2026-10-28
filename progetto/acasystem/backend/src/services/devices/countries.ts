/**
 * The `country` selector of HA (a country code, ISO 3166-1 alpha-2) as a list of choices with the
 * Italian names. The names come from the Intl data of Node; a code it does not know is shown as
 * the code itself.
 */

const CODES =
  'AD AE AF AG AI AL AM AO AQ AR AS AT AU AW AX AZ BA BB BD BE BF BG BH BI BJ BL BM BN BO BQ BR BS BT BV BW BY BZ ' +
  'CA CC CD CF CG CH CI CK CL CM CN CO CR CU CV CW CX CY CZ DE DJ DK DM DO DZ EC EE EG EH ER ES ET FI FJ FK FM FO ' +
  'FR GA GB GD GE GF GG GH GI GL GM GN GP GQ GR GS GT GU GW GY HK HM HN HR HT HU ID IE IL IM IN IO IQ IR IS IT JE ' +
  'JM JO JP KE KG KH KI KM KN KP KR KW KY KZ LA LB LC LI LK LR LS LT LU LV LY MA MC MD ME MF MG MH MK ML MM MN MO ' +
  'MP MQ MR MS MT MU MV MW MX MY MZ NA NC NE NF NG NI NL NO NP NR NU NZ OM PA PE PF PG PH PK PL PM PN PR PS PT PW ' +
  'PY QA RE RO RS RU RW SA SB SC SD SE SG SH SI SJ SK SL SM SN SO SR SS ST SV SX SY SZ TC TD TF TG TH TJ TK TL TM ' +
  'TN TO TR TT TV TW TZ UA UG UM US UY UZ VA VC VE VG VI VN VU WF WS YE YT ZA ZM ZW';

export const COUNTRY_CODES: readonly string[] = CODES.split(' ');

const names = new Intl.DisplayNames(['it'], { type: 'region' });

const nameOf = (code: string): string => {
  try {
    return names.of(code) ?? code;
  } catch {
    return code;
  }
};

/** The choices of a country selector: `allowed` (the codes HA lists) or all, by Italian name. */
export const countryOptions = (
  allowed: readonly string[] | null,
  sorted: boolean
): { value: string; label: string }[] => {
  const codes = (allowed ?? COUNTRY_CODES).filter((code) => /^[A-Z]{2}$/.test(code));
  const options = codes.map((code) => ({ value: code, label: nameOf(code) }));
  return sorted ? options.sort((a, b) => a.label.localeCompare(b.label, 'it')) : options;
};
