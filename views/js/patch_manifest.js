const patchLevel = 34;

const dataMapping = [
    {
        src: "Fractured Space.exe",
        dest: "spacegame/Binaries/Win64/Fractured Space.exe",
        md5: "394c6525e9c11b35ebe58f7f60b35966",
        sha256: "4d92ed3b30596c9dbdd5bf112c62050831d044c0eb2ff9aaa525f222a2bbe08a",
    },
    {
        src: "ClientConfig.json",
        dest: "spacegame/ClientConfig.json",
        md5: "f64b830ffe1d9dc6c553ddcf246dfb99",
        sha256: "0087a651ad5fbb235fa438b8d3a3f47cf2f6b11b3f88c528f82c48ccdc8d4b91",
    },
    {
        src: "startgame-script.js",
        dest: "spacegame/Content/UIResources/frontend/views/startgame/startgame-script.js",
        md5: "26e8ba2459da250bc88626077d4fbc40",
        sha256: "bac58eaa7f06a1b2401e5300e0141739055736bfb66d285e28b0096b83bcc1bb",
    },
    {
        src: "startgame-style.css",
        dest: "spacegame/Content/UIResources/frontend/views/startgame/startgame-style.css",
        md5: "e509d86542e15604ef9dfce07ecf8db6",
        sha256: "49e856f3667e0c22db18a8c864c62ae66f1e1e2940d0efb783955ea6e0460301",
    },
    {
        src: "gamemodes-config.js",
        dest: "spacegame/Content/UIResources/frontend/views/gamemodes/gamemodes-config.js",
        md5: "98ef75a070c63ade15da66dbb187a6b8",
        sha256: "3c4faf4289b6cff79c4a7af42fd0d027b26ee8cde8b273da6ffdee9e095c5067",
    },
    {
        src: "gamemodes-styles.css",
        dest: "spacegame/Content/UIResources/frontend/views/gamemodes/gamemodes-styles.css",
        md5: "a77c0549eef2a7ec86c47d00c24658ea",
        sha256: "51b2eddc2dc7193bb954bc19f8706994ba7070d13fe2f7eedd079403a08e3a4d",
    },
    {
        src: "nsloctext.js",
        dest: "spacegame/Content/UIResources/frontend/data/translations/nsloctext.js",
        md5: "322cedd955cd2b720967dda851164140",
        sha256: "d677ad0f5d8efa53b7f24ef6574fa348d469de33e96033ad95c0f39316a71c0b",
    },
    {
        src: "BP.pak",
        dest: "spacegame/Content/Paks/BP.pak",
        md5: "14641a1739369176dd70f02c5e0c821a",
        sha256: "e5a029920f06bc07bd4610c931efae28834d54b10f256c08a6cb550a6fea5b48",
    },
    {
        src: "results-script.js",
        dest: "spacegame/Content/UIResources/frontend/views/results/results-script.js",
        md5: "ae49d5328aff3203908db7609c94427f",
        sha256: "ace5e5197f6779efd46531c0f08c6b2b7d963f3ee23533bcbea3c6ab7c710766",
    },
    {
        src: "hangar-script.js",
        dest: "spacegame/Content/UIResources/frontend/views/hangar/hangar-script.js",
        md5: "4f3007a550352f7294fb9c47af3f74a6",
        sha256: "b3290327dfa2c94af87a58aa13b3021706f5685f249edbcd1a34bbb40ff8eede",
    },
    {
        src: "BaseEngine.ini",
        dest: "Engine/Config/BaseEngine.ini",
        md5: "280bf6a1ea48fa3c536a7a3b20cc150c",
        sha256: "047690ae6ce7ba5c0c7a5c8ab5b786050f02f985f3f8958f4d66f85ad1223dd4",
    }
];

// Folders (relative to the game folder) the patch may create. The patcher never creates any
// other folder: a dest whose folder is missing from the install is an error, since it means
// the install is broken or not the one we expect. List every new folder on its own, including
// new parents (both "spacegame/Content/New" and "spacegame/Content/New/Sub").
const createDirs = [];

module.exports = {
    patchLevel,
    dataMapping,
    createDirs
}