export const colors = {
  navy: "#04263A",
  navyDeep: "#031C2C",
  paytm: "#00BAF2",
  paytmDark: "#0096C7",
  ink: "#102A43",
  muted: "#627D98",
  bg: "#F4F7FB",
  card: "#FFFFFF",
  line: "#E4E7EB",
  red: "#D7263D",
  redBg: "#FDE8EC",
  yellow: "#B45309",
  yellowBg: "#FEF3C7",
  green: "#047857",
  greenBg: "#D1FAE5",
  whatsapp: "#075E54",
  chat: "#ECE5DD",
  bubble: "#DCF8C6",
  shadow: "#0B1F33",
};

export const cardShadow = {
  shadowColor: colors.shadow,
  shadowOffset: { width: 0, height: 8 },
  shadowOpacity: 0.06,
  shadowRadius: 16,
  elevation: 2,
};

export function rupee(value: string): string {
  const amount = Number(value);
  if (Number.isNaN(amount)) {
    return `₹${value}`;
  }
  return `₹${amount.toLocaleString("en-IN", {
    minimumFractionDigits: amount % 1 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  })}`;
}

export function hoursLabel(value: string): string {
  const hours = Number(value);
  if (Number.isNaN(hours)) {
    return value;
  }
  return `${Math.round(hours)}h`;
}

export function alertColors(alert: string): { fg: string; bg: string } {
  if (alert === "RED") {
    return { fg: colors.red, bg: colors.redBg };
  }
  if (alert === "YELLOW") {
    return { fg: colors.yellow, bg: colors.yellowBg };
  }
  return { fg: colors.green, bg: colors.greenBg };
}
