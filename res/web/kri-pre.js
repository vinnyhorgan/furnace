Module.preRun = Module.preRun || [];
Module.preRun.push(() => {
  const home = '/home/web_user';
  FS.mkdirTree(home);
  FS.mount(IDBFS, {}, home);
  addRunDependency('kri-idbfs');
  FS.syncfs(true, (error) => {
    if (error) console.error('could not load kri browser storage:', error);
    const layoutPath = `${home}/.config/furnace/layout.ini`;
    if (FS.analyzePath(layoutPath).exists) {
      let layout = FS.readFile(layoutPath, { encoding: 'utf8' });
      const oldDefaultLayout =
        layout.includes('ID=0x00000001 Parent=0x8B93E3BD SizeRef=1280,217') &&
        layout.includes('ID=0x00000002 Parent=0x8B93E3BD SizeRef=1280,512') &&
        layout.includes('ID=0x00000017 Parent=0x00000015 SizeRef=939,557') &&
        layout.includes('ID=0x00000018 Parent=0x00000015 SizeRef=305,557');
      if (oldDefaultLayout) {
        FS.unlink(layoutPath);
      } else {
        const updatedLayout = layout
          .replace(
            'ID=0x00000005 Parent=0x00000008 SizeRef=304,406',
            'ID=0x00000005 Parent=0x00000008 SizeRef=279,406'
          )
          .replace(
            'ID=0x00000006 Parent=0x00000008 SizeRef=323,406',
            'ID=0x00000006 Parent=0x00000008 SizeRef=348,406'
          )
          .replace(
            'ID=0x0000000D Parent=0x00000009 SizeRef=292,68',
            'ID=0x0000000D Parent=0x00000009 SizeRef=292,88'
          )
          .replace(
            'ID=0x0000000E Parent=0x00000009 SizeRef=292,105',
            'ID=0x0000000E Parent=0x00000009 SizeRef=292,85'
          )
          .replace(
            'ID=0x00000017 Parent=0x00000015 SizeRef=847,557',
            'ID=0x00000017 Parent=0x00000015 SizeRef=814,557'
          )
          .replace(
            'ID=0x00000018 Parent=0x00000015 SizeRef=397,557',
            'ID=0x00000018 Parent=0x00000015 SizeRef=430,557'
          );
        if (updatedLayout !== layout) FS.writeFile(layoutPath, updatedLayout);
      }
    }
    let syncInFlight = false;
    let syncQueued = false;
    Module.kriSyncStorage = () => {
      if (syncInFlight) {
        syncQueued = true;
        return;
      }
      syncInFlight = true;
      FS.syncfs(false, (syncError) => {
        syncInFlight = false;
        if (syncError) console.error('could not save kri browser storage:', syncError);
        if (syncQueued) {
          syncQueued = false;
          Module.kriSyncStorage();
        }
      });
    };
    Module.furnaceSyncTimer = window.setInterval(Module.kriSyncStorage, 5000);
    removeRunDependency('kri-idbfs');
  });
});
