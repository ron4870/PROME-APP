const fs = require('fs');
let code = fs.readFileSync('src/pages/forms/FundsRequisitionForm.tsx', 'utf8');
code = code.replace("import QRCode from 'react-qr-code';", "import { QRCode } from 'react-qr-code';");
fs.writeFileSync('src/pages/forms/FundsRequisitionForm.tsx', code);
