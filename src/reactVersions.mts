export interface ReactVersion {
  version: string;
  package: string;
  // Name not currently used, although we could use this in the remapping logic
  // to more specifically check for the right filename to compare against.
  // Mostly just visual clarification in the array for now.
  name: string;
  contentHash: string;
}

export const knownReactProdVersions: ReactVersion[] = [
  {
    version: "17.0.2",
    package: "react-dom",
    name: "react-dom.production.min.js",
    contentHash: "aa5e027a236b156f5e833ae8a86e94474130b78f0b70386c1b213417d0013910",
  },
  {
    version: "18.1.0",
    package: "react-dom",
    name: "react-dom.production.min.js",
    contentHash: "db70122e66c434e360539319ef318959f303a8792417e3cbb14abb6e56294191",
  },
  {
    version: "18.2.0",
    package: "react",
    name: "react.production.min.js",
    contentHash: "12a71800adb60f93da6dfe5d40ebdf225101204dd51f5e7266cce243aefd6512",
  },
  {
    version: "18.2.0",
    package: "react-dom",
    name: "react-dom.production.min.js",
    contentHash: "1404cd9fd1e2ee3ce79fba01957b01c83f88ccd86a3e55e6a51a871d9fe05552",
  },
  {
    version: "18.2.0",
    package: "react-dom",
    name: "react-dom.profiling.min.js",
    contentHash: "81f4765156d0468929630c316276e0d7e5ec7940fde7d10380dd2d9b889327b5",
  },
  {
    version: "0.0.0-experimental-953cb02f6-20230907",
    package: "react-dom",
    name: "react-dom.production.min.js",
    contentHash: "4cd441458e2535562a74651cbcd02d7c2e1f163e364aca608d3c5b00448e1442",
  },
];

export const hashesToVersions: Record<string, ReactVersion> = {};

for (const version of knownReactProdVersions) {
  hashesToVersions[version.contentHash] = version;
}
