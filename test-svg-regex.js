const svgs = [
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1500 800">`,
  `<svg width="100%" height="100%" viewBox="0 0 1500 800" xmlns="...">`
];

svgs.forEach(svg => {
  let processed = svg;
  const match = processed.match(/viewBox="([^"]+)"/i);
  if (match) {
    const parts = match[1].trim().split(/\s+,?/);
    if (parts.length >= 4) {
      const width = parts[2];
      const height = parts[3];
      processed = processed.replace(/\s+width="[^"]*"/i, '');
      processed = processed.replace(/\s+height="[^"]*"/i, '');
      processed = processed.replace(/<svg\s+/i, `<svg width="${width}" height="${height}" `);
    }
  }
  console.log(processed);
});
