const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

test('both CARTO themes authenticate tile requests and preserve attribution and map overlays', () => {
  const html = fs.readFileSync(require.resolve('./index.html'),'utf8');
  const start = html.indexOf('const CARTO_BASEMAP_KEY =');
  const end = html.indexOf('function initOsmMap()',start);
  assert.ok(start >= 0 && end > start);
  const layers = [];
  const map = {};
  const context = vm.createContext({
    osmMap:map,osmBaseLayer:null,
    document:{documentElement:{dataset:{theme:'light'}}},
    L:{tileLayer(url,options){
      const layer = {url,options,removed:false,addTo(target){assert.equal(target,map);return this;},remove(){this.removed=true;},bringToBack(){this.behindOverlays=true;}};
      layers.push(layer);
      return layer;
    }}
  });
  vm.runInContext(html.slice(start,end),context);
  context.updateOsmBasemap();
  context.document.documentElement.dataset.theme = 'dark';
  context.updateOsmBasemap();
  assert.equal(layers.length,2);
  assert.match(layers[0].url,/\/rastertiles\/voyager\//);
  assert.match(layers[1].url,/\/dark_all\//);
  for(const layer of layers){
    const key = new URL(layer.url).searchParams.get('key');
    assert.ok(key && key.startsWith('cb1_'),'Configured browser key is required');
    assert.equal(new URL(layer.url).searchParams.getAll('key').length,1);
    assert.match(layer.options.attribution,/openstreetmap.org\/copyright/);
    assert.match(layer.options.attribution,/carto.com\/attributions/);
    assert.equal(layer.behindOverlays,true);
  }
  assert.equal(layers[0].removed,true);
  assert.equal(layers[1].removed,false);
  assert.equal(context.osmMap,map);
});
