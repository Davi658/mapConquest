const fs = require('fs');
const src = fs.readFileSync('src/interfaces/map-editor.js', 'utf8');
const lines = src.split('\n');

const issues = [];
const ok = [];

// 1. saveChangesToServer chamado sem await (async fire-and-forget pode engolir erros)
const saveCallLines = lines.map((l, i) => ({line: i+1, content: l})).filter(({content}) =>
  /saveChangesToServer\(\)/.test(content) && !/await\s+saveChangesToServer/.test(content) && !/async\s+saveChangesToServer/.test(content)
);
if (saveCallLines.length > 0) {
  saveCallLines.forEach(({line, content}) => {
    if (!/^\s*async\s+saveChangesToServer/.test(content)) {
      issues.push(`[WARN] L${line}: saveChangesToServer() chamado sem await (fire-and-forget). Erros de rede nao serao capturados pela stack de chamada: "${content.trim()}"`);
    }
  });
} else {
  ok.push('OK: saveChangesToServer sempre chamado com await');
}

// 2. Acesso direto a this.selectedLayer sem guarda nulo
const dangerousAccess = lines.map((l, i) => ({line: i+1, content: l})).filter(({content}) =>
  /this\.selectedLayer\.(pm|getLatLngs|setLatLngs|off|on)\b/.test(content)
);
if (dangerousAccess.length > 0) {
  dangerousAccess.slice(0, 5).forEach(({line, content}) =>
    issues.push(`[WARN] L${line}: acesso a this.selectedLayer sem verificacao de nulo: "${content.trim()}"`)
  );
  if (dangerousAccess.length > 5) issues.push(`  ... e mais ${dangerousAccess.length - 5} ocorrencias`);
} else {
  ok.push('OK: sem acessos perigosos a this.selectedLayer');
}

// 3. Métodos duplicados
const methodDefs = src.match(/^    ([a-zA-Z_$][a-zA-Z0-9_$]*)\s*\(/gm) || [];
const methodNames = methodDefs.map(m => m.trim().split('(')[0]);
const seen = {};
const dupes = [];
methodNames.forEach(m => { if (seen[m]) dupes.push(m); seen[m] = true; });
if (dupes.length) issues.push(`[ERROR] Metodos duplicados na classe: ${[...new Set(dupes)].join(', ')}`);
else ok.push('OK: nenhum metodo duplicado');

// 4. Event listeners pm:markercreate - verificar se sao removidos
const addCount = (src.match(/\.on\s*\(\s*['"]pm:markercreate['"]/g) || []).length;
const removeCount = (src.match(/\.off\s*\(\s*['"]pm:markercreate['"]/g) || []).length;
if (addCount !== removeCount) {
  issues.push(`[WARN] pm:markercreate: ${addCount}x adicionado, ${removeCount}x removido. Possivel vazamento de listener se a layer for reutilizada.`);
} else {
  ok.push(`OK: pm:markercreate balanceado (${addCount} add / ${removeCount} remove)`);
}

// 5. pm:edit listener balance
const editAdd = (src.match(/\.on\s*\(\s*['"]pm:edit['"]/g) || []).length;
const editRemove = (src.match(/\.off\s*\(\s*['"]pm:edit['"]/g) || []).length;
if (editAdd !== editRemove) {
  issues.push(`[WARN] pm:edit: ${editAdd}x adicionado, ${editRemove}x removido. Possivel listener duplicado em re-selecao.`);
} else {
  ok.push(`OK: pm:edit balanceado (${editAdd}/${editRemove})`);
}

// 6. Uso de this.geeLayers vs this.layersMap (confusao comum)
const geeLayersLines = lines.map((l,i)=>({line:i+1,content:l})).filter(({content}) =>
  /this\.geeLayers\b/.test(content) && !/\/\//.test(content)
);
const layersMapLines = lines.map((l,i)=>({line:i+1,content:l})).filter(({content}) =>
  /this\.layersMap\b/.test(content) && !/\/\//.test(content)
);
ok.push(`INFO: this.geeLayers usado ${geeLayersLines.length}x, this.layersMap usado ${layersMapLines.length}x (verificar consistencia)`);

// 7. performSeparateIsland - verifica se feature.geometry é atualizada antes de salvar
const sepIdx = lines.findIndex(l => /performSeparateIsland/.test(l) && /\{$/.test(l));
if (sepIdx >= 0) {
  const block = lines.slice(sepIdx, sepIdx + 120).join('\n');
  const hasUpdateGeometry = /updateFeatureGeometry/.test(block);
  if (!hasUpdateGeometry) {
    ok.push('INFO: performSeparateIsland nao chama updateFeatureGeometry() diretamente (usa plotSingleGeoJSONFeature - verificar se geometry esta correta no geoJSONData)');
  }
}

// 8. Verificar se deleteSelectedVertices protege contra < 3 vertices
const dvIdx = lines.findIndex(l => /deleteSelectedVertices/.test(l) && /\{$/.test(l));
if (dvIdx >= 0) {
  const block = lines.slice(dvIdx, dvIdx + 40).join('\n');
  if (!/length.*[<>]=?\s*[34]/.test(block) && !/[34]\s*[<>]=?\s*.*length/.test(block)) {
    issues.push(`[WARN] L${dvIdx+1}: deleteSelectedVertices() pode nao verificar minimo de vertices (risco de poligono invalido)`);
  } else {
    ok.push('OK: deleteSelectedVertices tem verificacao de minimo de vertices');
  }
}

// 9. Verifica se toggleVertexSelection existe
if (/toggleVertexSelection/.test(src)) {
  ok.push('OK: toggleVertexSelection encontrado');
} else {
  issues.push('[ERROR] toggleVertexSelection nao encontrado no arquivo!');
}

// 10. Verificar this.selectedPaths vs this.selectedVertices (consistencia de nomenclatura)
const hasPaths = /this\.selectedPaths/.test(src);
const hasVertices = /this\.selectedVertices/.test(src);
ok.push(`INFO: this.selectedPaths=${hasPaths}, this.selectedVertices=${hasVertices} (ambos usados? verificar consistencia)`);

// OUTPUT
console.log('\n========== ERROS ==========');
if (issues.length === 0) console.log('Nenhum erro estrutural encontrado.');
else issues.forEach(i => console.log(i));

console.log('\n========== OK / INFO ==========');
ok.forEach(o => console.log(o));
