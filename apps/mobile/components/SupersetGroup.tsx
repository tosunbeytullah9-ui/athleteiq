import React from "react";
import { View, Text } from "react-native";

interface SupersetGroupProps {
  label: string;
  children: React.ReactNode;
}

export function SupersetGroup({ label, children }: SupersetGroupProps) {
  const items = React.Children.toArray(children);
  return (
    <View className="mb-3 rounded-2xl border-2 border-violet-300 bg-violet-50 p-2">
      <Text className="text-violet-700 text-xs font-bold uppercase tracking-wide px-2 pt-1 pb-2">
        {label}
      </Text>
      {items.map((child, i) => (
        <View key={i}>
          {child}
          {i < items.length - 1 && (
            <View className="items-center -my-2 z-10">
              <View className="w-6 h-6 rounded-full bg-violet-500 items-center justify-center">
                <Text className="text-white text-xs font-bold">+</Text>
              </View>
            </View>
          )}
        </View>
      ))}
    </View>
  );
}
