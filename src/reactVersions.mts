export interface ReactVersion {
  version: string;
  package: string;
  contentHash: string;
  filename: string;
}

export const availableSourcemapDescriptors: ReactVersion[] = [
  // react
  {
    version: "18.2.0",
    package: "react",
    filename: "react.production.min.js",
    contentHash: "12a71800adb60f93da6dfe5d40ebdf225101204dd51f5e7266cce243aefd6512",
  },
  {
    version: "18.1.0",
    package: "react",
    filename: "react.production.min.js",
    contentHash: "5350b7eb5e15e518dd4f0105d7ab04ce2c97169a3e11690d13364aae0bf8b98f",
  },
  {
    version: "17.0.2",
    package: "react",
    filename: "react.production.min.js",
    contentHash: "d3ea88ce03534dc2f3060f4ca55f26dfa26466b2077f61ff401fba2529567254",
  },
  // react-dom
  {
    version: "18.2.0",
    package: "react-dom",
    filename: "react-dom.production.min.js",
    contentHash: "1404cd9fd1e2ee3ce79fba01957b01c83f88ccd86a3e55e6a51a871d9fe05552",
  },
  {
    version: "18.1.0",
    package: "react-dom",
    filename: "react-dom.production.min.js",
    contentHash: "db70122e66c434e360539319ef318959f303a8792417e3cbb14abb6e56294191",
  },
  {
    version: "17.0.2",
    package: "react-dom",
    filename: "react-dom.production.min.js",
    contentHash: "aa5e027a236b156f5e833ae8a86e94474130b78f0b70386c1b213417d0013910",
  },
  {
    version: "0.0.0-experimental-953cb02f6-20230907",
    package: "react-dom",
    filename: "react-dom.production.min.js",
    contentHash: "4cd441458e2535562a74651cbcd02d7c2e1f163e364aca608d3c5b00448e1442",
  },
  // react-dom/profiling
  {
    version: "18.2.0",
    package: "react-dom",
    filename: "react-dom.profiling.min.js",
    contentHash: "81f4765156d0468929630c316276e0d7e5ec7940fde7d10380dd2d9b889327b5",
  },
  {
    version: "18.1.0",
    package: "react-dom",
    filename: "react-dom.profiling.min.js",
    contentHash: "115a2baefc4c008bc89cab1062457dfb4944efd7b841fd4d44016efe0bd5a95f",
  },
  {
    version: "18.2.0",
    package: "react-dom",
    filename: "react-dom.profiling.min.js",
    contentHash: "c6d18f6f0b8479f2552da042d37e3b70bb4859251bc05e7bd3e9b100d68f2a30",
  },
];

export const hashesToSourcemapDescriptors: Record<string, ReactVersion> = {};

for (const descriptor of availableSourcemapDescriptors) {
  hashesToSourcemapDescriptors[descriptor.contentHash] = descriptor;
}
