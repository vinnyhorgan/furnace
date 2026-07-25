Module.preRun = Module.preRun || [];
Module.preRun.push(() => {
  const home = '/home/web_user';
  const storageState = {
    ready: false,
    dirty: false,
    syncing: false,
    error: '',
    lastSync: 0,
    usage: 0,
    quota: 0,
    persistent: false
  };
  Module.kriStorageState = storageState;
  const renderStorageState = () => {
    Module.kriStorageState = storageState;
  };
  const refreshStorageEstimate = async () => {
    if (!navigator.storage || !navigator.storage.estimate) return;
    try {
      const estimate = await navigator.storage.estimate();
      storageState.usage = estimate.usage || 0;
      storageState.quota = estimate.quota || 0;
      if (navigator.storage.persisted) {
        storageState.persistent = await navigator.storage.persisted();
      }
      renderStorageState();
    } catch (error) {
      console.warn('could not read kri browser storage quota:', error);
    }
  };

  Module.kriSetDocumentDirty = (dirty) => {
    storageState.dirty = Boolean(dirty);
    renderStorageState();
  };
  window.addEventListener('beforeunload', (event) => {
    if (!storageState.dirty) return;
    event.preventDefault();
    event.returnValue = '';
  });

  const writeAscii = (target, offset, length, value) => {
    const encoded = new TextEncoder().encode(value);
    target.set(encoded.subarray(0, length), offset);
  };
  const writeOctal = (target, offset, length, value) => {
    const encoded = Math.max(0, value).toString(8).padStart(length - 1, '0') + '\0';
    writeAscii(target, offset, length, encoded);
  };
  const tarRecord = (name, data, modified, type = '0') => {
    const header = new Uint8Array(512);
    writeAscii(header, 0, 100, name);
    writeOctal(header, 100, 8, 0o644);
    writeOctal(header, 108, 8, 0);
    writeOctal(header, 116, 8, 0);
    writeOctal(header, 124, 12, data.length);
    writeOctal(header, 136, 12, Math.floor(modified / 1000));
    header.fill(32, 148, 156);
    header[156] = type.charCodeAt(0);
    writeAscii(header, 257, 6, 'ustar\0');
    writeAscii(header, 263, 2, '00');
    writeAscii(header, 265, 32, 'kri');
    writeAscii(header, 297, 32, 'kri');
    let checksum = 0;
    for (const byte of header) checksum += byte;
    writeAscii(header, 148, 8, checksum.toString(8).padStart(6, '0') + '\0 ');
    const padding = new Uint8Array((512 - (data.length % 512)) % 512);
    return [header, data, padding];
  };
  const tarEntry = (name, data, modified) => {
    if (new TextEncoder().encode(name).length<=100) {
      return tarRecord(name,data,modified);
    }
    // GNU long-name records keep unusually long project names intact.
    const longName = new TextEncoder().encode(`${name}\0`);
    const fallback = name.slice(-100);
    return [
      ...tarRecord('././@LongLink',longName,modified,'L'),
      ...tarRecord(fallback,data,modified)
    ];
  };
  Module.kriDownloadRecoveryArchive = () => {
    const files = [];
    const walk = (path) => {
      for (const name of FS.readdir(path)) {
        if (name === '.' || name === '..') continue;
        const child = `${path}/${name}`;
        const info = FS.stat(child);
        if (FS.isDir(info.mode)) {
          walk(child);
        } else if (name.toLowerCase().endsWith('.fur')) {
          files.push({ path: child, info });
        }
      }
    };
    walk(home);
    if (!files.length) {
      alert('kri has no local recovery projects yet.');
      return;
    }
    const parts = [];
    for (const file of files.sort((a, b) => a.path.localeCompare(b.path))) {
      const relative = file.path.slice(home.length + 1);
      const modified = file.info.mtime instanceof Date
        ? file.info.mtime.getTime()
        : (Number(file.info.mtime) || Date.now());
      parts.push(...tarEntry(relative, FS.readFile(file.path), modified));
    }
    parts.push(new Uint8Array(1024));
    const blob = new Blob(parts, { type: 'application/x-tar' });
    const link = document.createElement('a');
    const now = new Date().toISOString().replaceAll(':', '-').replace(/\..+/, '');
    link.href = URL.createObjectURL(blob);
    link.download = `kri-recovery-${now}.tar`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(link.href), 1000);
  };
  FS.mkdirTree(home);
  FS.mount(IDBFS, {}, home);
  addRunDependency('kri-idbfs');
  FS.syncfs(true, (error) => {
    storageState.ready = true;
    if (error) {
      storageState.error = `could not load local storage: ${error}`;
      console.error('could not load kri browser storage:', error);
    }
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
            'ID=0x00000003 Parent=0x00000001 SizeRef=976,231',
            'ID=0x00000003 Parent=0x00000001 SizeRef=936,231'
          )
          .replace(
            'ID=0x00000004 Parent=0x00000001 SizeRef=302,231',
            'ID=0x00000004 Parent=0x00000001 SizeRef=342,231'
          )
          .replace(
            'ID=0x00000005 Parent=0x00000008 SizeRef=304,406',
            'ID=0x00000005 Parent=0x00000008 SizeRef=300,406'
          )
          .replace(
            'ID=0x00000006 Parent=0x00000008 SizeRef=323,406',
            'ID=0x00000006 Parent=0x00000008 SizeRef=327,406'
          )
          .replace(
            'ID=0x00000005 Parent=0x00000008 SizeRef=279,406',
            'ID=0x00000005 Parent=0x00000008 SizeRef=300,406'
          )
          .replace(
            'ID=0x00000006 Parent=0x00000008 SizeRef=348,406',
            'ID=0x00000006 Parent=0x00000008 SizeRef=327,406'
          )
          .replace(
            'ID=0x00000005 Parent=0x00000008 SizeRef=285,406',
            'ID=0x00000005 Parent=0x00000008 SizeRef=300,406'
          )
          .replace(
            'ID=0x00000006 Parent=0x00000008 SizeRef=342,406',
            'ID=0x00000006 Parent=0x00000008 SizeRef=327,406'
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
      storageState.syncing = true;
      renderStorageState();
      FS.syncfs(false, (syncError) => {
        syncInFlight = false;
        storageState.syncing = false;
        if (syncError) {
          storageState.error = `could not save local storage: ${syncError}`;
          console.error('could not save kri browser storage:', syncError);
        } else {
          storageState.error = '';
          storageState.lastSync = Date.now();
        }
        renderStorageState();
        if (syncQueued) {
          syncQueued = false;
          Module.kriSyncStorage();
        }
      });
    };
    Module.furnaceSyncTimer = window.setInterval(Module.kriSyncStorage, 5000);
    window.addEventListener('pagehide', Module.kriSyncStorage);
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') Module.kriSyncStorage();
    });
    refreshStorageEstimate();
    if (navigator.storage && navigator.storage.persist) {
      navigator.storage.persist().then((granted) => {
        storageState.persistent=granted;
        renderStorageState();
      }).catch((error) => {
        console.warn('could not request persistent kri storage:',error);
      });
    }
    window.setInterval(refreshStorageEstimate, 30000);
    renderStorageState();
    removeRunDependency('kri-idbfs');
  });
});
