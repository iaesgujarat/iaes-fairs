import { Text, View, StyleSheet } from "@react-pdf/renderer";
import { IAES_BANK_INR_ROWS, IAES_BANK_USD_ROWS } from "@/lib/iaesBank";

const s = StyleSheet.create({
  wrap: {
    marginTop: 18,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
  },
  heading: {
    fontSize: 8,
    fontWeight: 700,
    color: "#0B2B5C",
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: 8,
  },
  cols: { flexDirection: "row", justifyContent: "space-between" },
  col: { width: "48%" },
  subHead: {
    fontSize: 7.5,
    fontWeight: 700,
    color: "#92400E",
    backgroundColor: "#FFF8E1",
    paddingVertical: 3,
    paddingHorizontal: 4,
    marginBottom: 5,
  },
  row: { flexDirection: "row", marginBottom: 2 },
  label: { width: 86, fontSize: 7, color: "#6F7B8F" },
  value: { flex: 1, fontSize: 7.5, color: "#0B2B5C", fontWeight: 700 },
});

function BankCol({
  title,
  rows,
}: {
  title: string;
  rows: ReadonlyArray<readonly [string, string]>;
}) {
  return (
    <View style={s.col}>
      <Text style={s.subHead}>{title}</Text>
      {rows.map(([label, value]) => (
        <View style={s.row} key={label}>
          <Text style={s.label}>{label}</Text>
          <Text style={s.value}>{value}</Text>
        </View>
      ))}
    </View>
  );
}

export function BankDetailsPDF() {
  return (
    <View style={s.wrap} wrap={false}>
      <Text style={s.heading}>IAES Bank Details</Text>
      <View style={s.cols}>
        <BankCol
          title="Center's Bank Details for Local Currency (INR) Payment"
          rows={IAES_BANK_INR_ROWS}
        />
        <BankCol
          title="Correspondent bank detail for USD currency"
          rows={IAES_BANK_USD_ROWS}
        />
      </View>
    </View>
  );
}
