import Web3 from 'web3'
const web3 = new Web3()

export function formatDigits(num, percision) {
  return parseFloat(num).toFixed(percision)
}

export const handleDecimals = (rawAmt, decimal) => {
  return Math.round(parseFloat(rawAmt) * 10 ** decimal);
};

export const fromWei = web3.utils.fromWei
export const toWei = web3.utils.toWei

/**
 * 
 * @param {string | number} amtInEth 
 */
export const formatETHAmtToStr = (amtInEth) => {
  const strETHSegments = amtInEth.toString().split('.')
  const int = strETHSegments[0]
  if (strETHSegments.length === 1) return int
  let digits = strETHSegments[1]
  if(digits.length > 18) digits = digits.slice(0, 18)
  const result = `${int}.${digits}`
  return result
}

export const toTokenUnits = (tokenAmount, tokenDecimals) => {
  return tokenAmount / 10 ** tokenDecimals
}

export function timeSince(timeStamp) {
  var now = new Date(),
    secondsPast = (now.getTime() - timeStamp) / 1000;
  if (secondsPast < 60) {
    return parseInt(secondsPast) + 's ago';
  }
  if (secondsPast < 3600) {
    return parseInt(secondsPast / 60) + 'm ago';
  }
  if (secondsPast <= 86400) {
    return parseInt(secondsPast / 3600) + 'h ago';
  }
  if (secondsPast > 86400) {
    const ts = new Date(timeStamp)
    const day = ts.getDate();
    const month = ts.toDateString().match(/ [a-zA-Z]*/)[0].replace(" ", "");
    const year = ts.getFullYear() === now.getFullYear() ? "" : " " + ts.getFullYear();
    return day + " " + month + year;
  }
}

export function compareVaultRatio(vaultA, vaultB) {
  const rateA = vaultA.ratio;
  const rateB = vaultB.ratio;

  let comparison = 0;
  if (parseFloat(rateA) > parseFloat(rateB)) {
    comparison = 1;
  } else if (parseFloat(rateA) < parseFloat(rateB)) {
    comparison = -1;
  }
  return comparison;
}

/**
 * 
 * @param {string} collateral 
 * @param {string} tokenIssued 
 * @param {number} strikePrice 
 * @param {number} strikeValueInWei 
 * @return {number}
 */
export const calculateRatio = (collateral, tokenIssued, strikePrice, strikeValueInWei) => {
  if (tokenIssued === '0') return Infinity
  return parseInt(collateral) / ( parseInt(tokenIssued) * strikePrice * strikeValueInWei  )
}