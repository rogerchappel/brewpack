export interface PackageInput {
    name: string;
    version: string;
    description: string;
    license: string;
    homepage?: string;
    repository?: string | {
        url?: string;
    };
    binaries?: string[];
    caveats?: string[];
    test?: {
        command?: string;
        expect?: string;
    };
}
export interface FixtureInput {
    package: PackageInput;
    tap?: {
        owner?: string;
        repo?: string;
    };
    artifacts?: unknown[];
}
export interface PackageSpec {
    slug: string;
    formulaName: string;
    formulaClass: string;
    packageName: string;
    version: string;
    description: string;
    license: string;
    homepage: string;
    repository: string;
    owner: string;
    repo: string;
    binaries: string[];
    caveats: string[];
    test: {
        command: string;
        expect: string;
    };
    artifacts: unknown[];
}
export interface BrewpackPlan {
    packageName: string;
    formulaName: string;
    formulaClass: string;
    tapRepository: string;
    releaseArchiveUrl: string;
    binaries: string[];
    caveats: string[];
    generatedFiles: string[];
    nextSteps: string[];
}
export interface TapValidationResult {
    valid: boolean;
    missing: string[];
    warnings: string[];
}
export declare function packageJsonToFixture(raw: unknown): FixtureInput;
export declare function parsePackageFixture(raw: unknown): PackageSpec;
export declare function renderFormula(spec: PackageSpec): string;
export declare function renderTapReadme(spec: PackageSpec): string;
export declare function buildPlan(spec: PackageSpec): BrewpackPlan;
export declare function validateTapLayout(entries: string[], formulaEntries?: string[]): TapValidationResult;
export declare function resolveOutputPaths(outputDir: string, spec: PackageSpec): {
    root: string;
    formulaDir: string;
    formulaFile: string;
    readmeFile: string;
    planFile: string;
};
