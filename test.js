const processIPFSURL = (image) => {
  const prefix = 'https://opensea.mypinata.cloud/ipfs/'
  if (image == null) {
    return null
  } else if (image.indexOf('ipfs://ipfs/') === 0) {
    return prefix + image.slice(12)
  } else if (image.indexOf('ipfs://') === 0) {
    return prefix + image.slice(7)
  } else if (image.indexOf('https://ipfs.io/ipfs/') === 0) {
    return prefix + image.slice(21)
  } else if (image.indexOf('https://infura-ipfs.io/ipfs/') === 0) {
    return prefix + image.slice(28)
  } else if (image.indexOf('pinata.cloud/ipfs/') !== -1) {
    const index = image.indexOf('pinata.cloud/ipfs/')
    return prefix + image.slice(index + 18)
  } else {
    return image
  }
}

console.log('1: ', processIPFSURL('https://ipfs.io/ipfs/QmbpPYYgbHKU7rYiz5Fd58nLCEEPGxyqH3WNA2WsFffv3a?filename=LooleeBear_471.png'))