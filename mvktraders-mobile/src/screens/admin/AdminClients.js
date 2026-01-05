import React, { useEffect, useState, useMemo } from 'react';
import { View, Text, StyleSheet, FlatList, RefreshControl, TouchableOpacity, ActivityIndicator, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../../context/ThemeContext';
import { adminService } from '../../api/admin';
import { formatCurrency } from '../../utils/formatters';
import { ArrowLeft, Search, UserPlus, Filter } from 'lucide-react-native';

export default function AdminClients({ navigation }) {
    const { theme } = useTheme();
    const styles = useMemo(() => getStyles(theme), [theme]);

    const [clients, setClients] = useState([]);
    const [filteredClients, setFilteredClients] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');

    const loadClients = async () => {
        try {
            const data = await adminService.getClientsSummary();
            // Data is list of AdminClientSummaryDTO
            setClients(data);
            setFilteredClients(data);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadClients();
    }, []);

    const handleSearch = (text) => {
        setSearchQuery(text);
        if (!text) {
            setFilteredClients(clients);
        } else {
            const lower = text.toLowerCase();
            setFilteredClients(clients.filter(c =>
                (c.clientName && c.clientName.toLowerCase().includes(lower)) ||
                (c.email && c.email.toLowerCase().includes(lower))
            ));
        }
    };

    const renderItem = ({ item }) => (
        <TouchableOpacity
            style={styles.card}
            onPress={() => navigation.navigate('AdminClientDetails', { clientId: item.clientId, clientName: item.clientName })}
        >
            <View style={styles.row}>
                <View style={styles.avatar}>
                    <Text style={styles.avatarText}>{(item.clientName || '?').charAt(0).toUpperCase()}</Text>
                </View>
                <View style={{ flex: 1, marginLeft: 12 }}>
                    <Text style={styles.name}>{item.clientName}</Text>
                    <Text style={styles.email}>{item.email}</Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                    <Text style={styles.amount}>{formatCurrency(item.totalInvested)}</Text>
                    <Text style={styles.label}>Invested</Text>
                </View>
            </View>
            <View style={styles.footer}>
                <View style={[styles.badge, { backgroundColor: item.status === 'ACTIVE' ? theme.successBg : theme.errorBg }]}>
                    <Text style={[styles.badgeText, { color: item.status === 'ACTIVE' ? theme.success : theme.error }]}>
                        {item.status}
                    </Text>
                </View>
                <Text style={styles.joinDate}>Updated {new Date(item.lastUpdated).toLocaleDateString()}</Text>
            </View>
        </TouchableOpacity>
    );

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                    <ArrowLeft size={24} color={theme.textPrimary} />
                </TouchableOpacity>
                <Text style={styles.pageTitle}>All Clients</Text>
                <TouchableOpacity onPress={() => navigation.navigate('AdminCreateUser')} style={styles.addBtn}>
                    <UserPlus size={20} color="#fff" />
                </TouchableOpacity>
            </View>

            <View style={styles.searchBar}>
                <Search size={20} color={theme.textSecondary} />
                <TextInput
                    style={styles.input}
                    placeholder="Search by name or email..."
                    placeholderTextColor={theme.textSecondary}
                    value={searchQuery}
                    onChangeText={handleSearch}
                />
            </View>

            {loading ? (
                <View style={styles.center}>
                    <ActivityIndicator size="large" color={theme.primary} />
                </View>
            ) : (
                <FlatList
                    data={filteredClients}
                    renderItem={renderItem}
                    keyExtractor={item => item.clientId}
                    contentContainerStyle={styles.list}
                    refreshControl={<RefreshControl refreshing={loading} onRefresh={loadClients} tintColor={theme.primary} />}
                    ListEmptyComponent={
                        <View style={styles.center}>
                            <Text style={{ color: theme.textSecondary }}>No clients found</Text>
                        </View>
                    }
                />
            )}
        </SafeAreaView>
    );
}

const getStyles = (theme) => StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.background },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },

    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, borderBottomWidth: 1, borderBottomColor: theme.cardBorder },
    backBtn: { padding: 8, marginRight: 8 },
    pageTitle: { fontSize: 20, fontWeight: '700', color: theme.textPrimary },
    addBtn: { backgroundColor: theme.primary, padding: 8, borderRadius: 10 },

    searchBar: { flexDirection: 'row', alignItems: 'center', backgroundColor: theme.cardBg, margin: 16, padding: 12, borderRadius: 12, borderWidth: 1, borderColor: theme.cardBorder },
    input: { flex: 1, marginLeft: 10, color: theme.textPrimary, fontSize: 16 },

    list: { paddingHorizontal: 16 },
    card: { backgroundColor: theme.cardBg, borderRadius: 16, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: theme.cardBorder },
    row: { flexDirection: 'row', alignItems: 'center' },
    avatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: theme.primaryBg, justifyContent: 'center', alignItems: 'center' },
    avatarText: { fontSize: 18, fontWeight: '700', color: theme.primary },
    name: { fontSize: 16, fontWeight: '600', color: theme.textPrimary },
    email: { fontSize: 12, color: theme.textSecondary },
    amount: { fontSize: 16, fontWeight: '700', color: theme.textPrimary },
    label: { fontSize: 10, color: theme.textSecondary, textAlign: 'right' },

    footer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: theme.cardBorder },
    badge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
    badgeText: { fontSize: 10, fontWeight: '700' },
    joinDate: { fontSize: 11, color: theme.textSecondary }
});
