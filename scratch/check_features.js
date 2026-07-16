const fs = require('fs');
const path = require('path');

const geojsonPath = path.join(__dirname, '..', 'src', 'data', 'napoleonic', 'world-napoleonic.geojson');
const data = JSON.parse(fs.readFileSync(geojsonPath, 'utf8'));

const processCoords = (arr, sum) => {
    arr.forEach(pt => {
        sum.lon += pt[0];
        sum.lat += pt[1];
        sum.count++;
    });
};

data.features.forEach(f => {
    if (f.id === 'feature_128' || f.id === 'feature_147') {
        let sum = { lon: 0, lat: 0, count: 0 };
        if (f.geometry.type === 'Polygon') {
            processCoords(f.geometry.coordinates[0], sum);
        } else if (f.geometry.type === 'MultiPolygon') {
            f.geometry.coordinates.forEach(poly => {
                processCoords(poly[0], sum);
            });
        }
        console.log(`ID: ${f.id}, Name: ${f.properties.name}, Center: [${sum.lon / sum.count}, ${sum.lat / sum.count}]`);
    }
});
