export class Exporter {

    static exportAsJson = (obj, filename) => {
        const blob = new Blob([JSON.stringify(obj, null, 2)], {
          type: 'application/json',
        });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${filename}.json`;
        a.click();
        URL.revokeObjectURL(url);
      }

    static exportCaves(caves) {
        caves.forEach(cave => {
            Exporter.exportAsJson(cave.toExport(), cave.name);
        });
    }
}