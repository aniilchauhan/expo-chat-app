import React from 'react';
import { View, Text, StyleSheet, FlatList } from 'react-native';

const dummyCalls = [
  { id: '1', name: 'Alice', type: 'voice', time: 'Today 10:21' },
  { id: '2', name: 'Bob', type: 'missed', time: 'Yesterday 18:04' },
];

const CallHistoryScreen: React.FC = () => {
  return (
    <View style={styles.container}>
      <FlatList
        data={dummyCalls}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={styles.item}>
            <Text style={styles.name}>{item.name}</Text>
            <Text style={styles.meta}>{item.type} • {item.time}</Text>
          </View>
        )}
        ListEmptyComponent={<Text style={styles.empty}>No calls yet</Text>}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff', padding: 16 },
  item: { paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#eee' },
  name: { fontSize: 16, fontWeight: '600' },
  meta: { color: '#666', marginTop: 2 },
  empty: { textAlign: 'center', color: '#666', marginTop: 24 },
});

export default CallHistoryScreen;


