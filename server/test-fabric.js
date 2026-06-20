const fabric = require('fabric').fabric;

async function run() {
  const t = new fabric.Textbox('[PAGE NAME]', { placeholderType: 'pageName', maxRows: 1 });
  const json = t.toJSON(['placeholderType', 'maxRows']);
  console.log('Original JSON:', json);

  const modJson = { ...json, text: 'Replaced Page Name' };
  delete modJson.textLines;
  delete modJson.styles;

  fabric.Textbox.fromObject(modJson, (obj) => {
    console.log('Rehydrated Object text:', obj.text);
    console.log('Rehydrated Object textLines:', obj.textLines);
  });
}

run();
