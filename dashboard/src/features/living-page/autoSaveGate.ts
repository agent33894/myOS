interface AutoSaveGateParams {
  enableAutoSave: boolean;
  hasUnsavedChanges: boolean;
  isActivelyEditing: boolean;
  title: string;
  isNewArtifact: boolean;
  artifactLoaded: boolean;
}

export function shouldRunAutoSaveAfterIdle({
  enableAutoSave,
  hasUnsavedChanges,
  isActivelyEditing,
  title,
  isNewArtifact,
  artifactLoaded,
}: AutoSaveGateParams): boolean {
  if (!enableAutoSave || !hasUnsavedChanges || isActivelyEditing) {
    return false;
  }

  if (!title.trim()) {
    return false;
  }

  if (!isNewArtifact && !artifactLoaded) {
    return false;
  }

  return true;
}
