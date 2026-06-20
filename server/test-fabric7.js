const { Textbox, util } = require('fabric');

async function run() {
  const t = new Textbox('[PAGE NAME]', { placeholderType: 'pageName', maxRows: 1 });
  const json = t.toJSON(['placeholderType', 'maxRows']);
  console.log('Original JSON:', json);

  const modJson = { ...json, text: 'Replaced Page Name' };
  delete modJson.textLines;
  delete modJson.styles;

  // Fabric 7 fromObject is a promise
  const obj = await Textbox.fromObject(modJson);
  console.log('Rehydrated Object text:', obj.text);
  console.log('Rehydrated Object textLines:', obj.textLines);
}

run();
