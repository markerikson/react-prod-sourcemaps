export interface ReactVersion {
  version: string;
  package: string;
  contentHash: string;
  filename: string;
}

export const availableSourcemapDescriptors: ReactVersion[] = [
  // react-dom
  {
    version: "17.0.2",
    package: "react-dom",
    contentHash: "aa5e027a236b156f5e833ae8a86e94474130b78f0b70386c1b213417d0013910",
    filename: "react-dom.production.min.js",
  },
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
    version: "0.0.0-experimental-953cb02f6-20230907",
    package: "react-dom",
    filename: "react-dom.production.min.js",
    contentHash: "4cd441458e2535562a74651cbcd02d7c2e1f163e364aca608d3c5b00448e1442",
  },
];

export const hashesToSourcemapDescriptors: Record<string, ReactVersion> = {};

for (const descriptor of availableSourcemapDescriptors) {
  hashesToSourcemapDescriptors[descriptor.contentHash] = descriptor;
}
