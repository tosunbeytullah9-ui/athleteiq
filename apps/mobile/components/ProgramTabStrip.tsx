import { ScrollView, TouchableOpacity, Text } from "react-native";

export interface ProgramTabInfo {
  id: string;
  label: string;
}

interface ProgramTabStripProps {
  tabs: ProgramTabInfo[];
  activeIndex: number;
  onSelect: (index: number) => void;
}

export function ProgramTabStrip({ tabs, activeIndex, onSelect }: ProgramTabStripProps) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      className="px-4 pt-3 pb-1 bg-gray-50"
      contentContainerClassName="gap-2"
    >
      {tabs.map((tab, i) => {
        const active = i === activeIndex;
        return (
          <TouchableOpacity
            key={tab.id}
            onPress={() => onSelect(i)}
            activeOpacity={0.75}
            className={`px-4 py-2 rounded-full ${active ? "bg-blue-700" : "bg-white border border-gray-200"}`}
          >
            <Text
              numberOfLines={1}
              className={`text-sm font-semibold ${active ? "text-white" : "text-gray-600"}`}
            >
              {tab.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}
