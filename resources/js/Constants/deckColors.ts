export const DECK_COLORS = [
    {
        value: "blue",
        bg: "bg-blue-500",
        ring: "ring-blue-500",
        text: "text-blue-500",
    },
    {
        value: "purple",
        bg: "bg-purple-500",
        ring: "ring-purple-500",
        text: "text-purple-500",
    },
    {
        value: "green",
        bg: "bg-green-500",
        ring: "ring-green-500",
        text: "text-green-500",
    },
    {
        value: "amber",
        bg: "bg-amber-500",
        ring: "ring-amber-500",
        text: "text-amber-500",
    },
    {
        value: "rose",
        bg: "bg-rose-500",
        ring: "ring-rose-500",
        text: "text-rose-500",
    },
    {
        value: "teal",
        bg: "bg-teal-500",
        ring: "ring-teal-500",
        text: "text-teal-500",
    },
    {
        value: "indigo",
        bg: "bg-indigo-500",
        ring: "ring-indigo-500",
        text: "text-indigo-500",
    },
    {
        value: "slate",
        bg: "bg-slate-500",
        ring: "ring-slate-500",
        text: "text-slate-500",
    },
] as const;

export type DeckColor = (typeof DECK_COLORS)[number]["value"];

export const DEFAULT_DECK_COLOR: DeckColor = "blue";

export function deckColorClasses(value: string) {
    return DECK_COLORS.find((c) => c.value === value) ?? DECK_COLORS[0];
}
