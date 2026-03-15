export function breadcrumbs(pathValue: string): Array<{ label: string; path: string }> {
  if (!pathValue) {
    return [{ label: "Home", path: "" }];
  }

  const segments = pathValue.split("/");
  return [{ label: "Home", path: "" }].concat(
    segments.map((segment, index) => ({
      label: segment,
      path: segments.slice(0, index + 1).join("/")
    }))
  );
}

