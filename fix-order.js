const fs = require('fs');
let content = fs.readFileSync('index.js', 'utf8');

const jsonLine = "app.use(express.json());";
if (content.includes(jsonLine)) {
  content = content.replace(jsonLine + "\n", "");
  content = content.replace(
    "const app = express();",
    "const app = express();\n" + jsonLine
  );
  fs.writeFileSync('index.js', content);
  console.log('Moved express.json() to the top successfully!');
} else {
  console.log('Could not find the exact line — check manually.');
}
