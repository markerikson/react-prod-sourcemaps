export interface ReactVersion {
  version: string;
  package: string;
  contentHash: string;
}

export const knownReactProdVersions: ReactVersion[] = [
  {
    version: "18.2.0",
    package: "react-dom",
    contentHash: "1404cd9fd1e2ee3ce79fba01957b01c83f88ccd86a3e55e6a51a871d9fe05552",
  },
  {
    version: "18.1.0",
    package: "react-dom",
    contentHash: "db70122e66c434e360539319ef318959f303a8792417e3cbb14abb6e56294191",
  },
];

export const hashesToVersions: Record<string, ReactVersion> = {};

for (const version of knownReactProdVersions) {
  hashesToVersions[version.contentHash] = version;
}
