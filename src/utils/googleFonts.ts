const loadedFamilies = new Set<string>()

export function loadGoogleFont(googleFont: string, weights = '400;500;600;700') {
  if (loadedFamilies.has(googleFont)) return
  loadedFamilies.add(googleFont)

  const familyParam = googleFont.replace(/ /g, '+')
  const id = `gf-${familyParam.toLowerCase()}`
  if (document.getElementById(id)) return

  const link = document.createElement('link')
  link.id = id
  link.rel = 'stylesheet'
  link.href = `https://fonts.googleapis.com/css2?family=${familyParam}:wght@${weights}&display=swap`
  document.head.appendChild(link)
}
