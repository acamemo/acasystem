import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();

// Start strict in migrated files, then expand coverage gradually.
const filesToCheck = [
  'src/components/cards/SensorCard.jsx',
  'src/components/cards/LightCard.jsx',
  'src/components/cards/MediaCards.jsx',
  'src/components/cards/CalendarCard.jsx',
  'src/components/cards/GenericAndroidTVCard.jsx',
  'src/components/cards/CarCard.jsx',
  'src/components/cards/FanCard.jsx',
  'src/components/cards/GenericNordpoolCard.jsx',
  'src/components/cards/MissingEntityCard.jsx',
  'src/components/cards/PersonStatus.jsx',
  'src/components/cards/RoomCard.jsx',
  'src/components/cards/StatusPill.jsx',
  'src/components/cards/TodoCard.jsx',
  'src/components/cards/VacuumCard.jsx',
  'src/components/ui/ConditionBuilder.jsx',
  'src/components/ui/SettingsDropdown.jsx',
  'src/components/ui/CustomIcons.jsx',
  'src/components/charts/SparkLine.jsx',
  'src/components/charts/InteractivePowerGraph.jsx',
  'src/components/charts/WeatherGraph.jsx',
  'src/components/ui/CardErrorBoundary.jsx',
  'src/components/pages/MediaPage.jsx',
  'src/layouts/Header.jsx',
  'src/layouts/ConnectionBanner.jsx',
  'src/modals/AddCardContent.jsx',
  'src/modals/ConfigModal.jsx',
  'src/modals/CostModal.jsx',
  'src/modals/EditCardModal.jsx',
  'src/modals/editCard/CarMappingsSection.jsx',
  'src/modals/editCard/RoomSettingsSection.jsx',
  'src/modals/GenericClimateModal.jsx',
  'src/modals/GenericAndroidTVModal.jsx',
  'src/modals/LeafModal.jsx',
  'src/modals/LightModal.jsx',
  'src/modals/MediaModal.jsx',
  'src/modals/NordpoolModal.jsx',
  'src/modals/PersonModal.jsx',
  'src/modals/RoomModal.jsx',
  'src/modals/SensorModal.jsx',
  'src/modals/StatusPillsConfigModal.jsx',
  'src/modals/TodoModal.jsx',
  'src/modals/VacuumModal.jsx',
  'src/modals/WeatherModal.jsx',
];

const forbiddenPatterns = [
  /text-gray-(?:300|400|500|600|700)\b/gi,
  /text-red-(?:300|400|500)\b/gi,
  /text-green-(?:300|400|500)\b/gi,
  /text-emerald-(?:300|400|500)\b/gi,
  /bg-red-500\/10\b/gi,
  /text-red-400\b/gi,
  /bg-emerald-500\/10\b/gi,
  /text-emerald-400\b/gi,
  /bg-green-500\/20\b/gi,
  /text-green-400\b/gi,
  /border-green-500\/20\b/gi,
  /bg-green-500\/10\b/gi,
  /border-emerald-500\/20\b/gi,
  /bg-emerald-500\/10\b/gi,
];

const violations = [];

for (const relativeFile of filesToCheck) {
  const filePath = path.join(root, relativeFile);
  if (!fs.existsSync(filePath)) {
    continue;
  }

  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split(/\r?\n/);

  lines.forEach((line, index) => {
    for (const pattern of forbiddenPatterns) {
      pattern.lastIndex = 0;
      if (pattern.test(line)) {
        violations.push({
          file: relativeFile,
          line: index + 1,
          pattern: pattern.toString(),
          text: line.trim(),
        });
      }
    }
  });
}

if (violations.length > 0) {
  console.error('Theme color lint failed. Use semantic CSS variables/tokens instead of hardcoded utility colors.');
  for (const violation of violations) {
    console.error(`- ${violation.file}:${violation.line} matched ${violation.pattern}`);
    console.error(`  ${violation.text}`);
  }
  process.exit(1);
}

console.log(`Theme color lint passed (${filesToCheck.length} files checked).`);
