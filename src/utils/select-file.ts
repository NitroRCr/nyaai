export function selectFile(callback: (files: File[]) => void, options?: { multiple?: boolean, accept?: string }) {
  const input = document.createElement('input')
  input.type = 'file'
  if (options?.multiple) input.multiple = true
  if (options?.accept) input.accept = options.accept

  input.onchange = (e: any) => {
    callback(Array.from(e.target.files))
  }

  input.click()
}
