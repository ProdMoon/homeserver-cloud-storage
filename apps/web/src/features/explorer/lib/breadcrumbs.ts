export function breadcrumbs(pathValue: string): Array<{ label: string; path: string }> {
  if (!pathValue) {
    return [{ label: 'Root', path: '' }];
  }

  const segments = pathValue.split('/');
  return [{ label: 'Root', path: '' }].concat(
    segments.map((segment, index) => ({
      label: segment,
      path: segments.slice(0, index + 1).join('/'),
    }))
  );
}
