import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, FlatList, RefreshControl, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../../context/ThemeContext';
import { Check, X, ArrowLeft, User, Clock, AlertCircle } from 'lucide-react-native';
import { adminService } from '../../api/admin';

export default function AdminApprovals({ navigation }) {
    const { theme } = useTheme();
    const styles = useMemo(() => getStyles(theme), [theme]);

    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [processId, setProcessId] = useState(null); // ID of user being processed

    const loadUsers = async () => {
        try {
            const data = await adminService.getPendingUsers();
            setUsers(data);
        } catch (error) {
            console.error(error);
            Alert.alert('Error', 'Failed to load pending users');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadUsers();
    }, []);

    const handleApprove = async (id, name) => {
        try {
            setProcessId(id);
            await adminService.approveUser(id);
            setUsers(prev => prev.filter(u => u.id !== id));
            Alert.alert('Success', `${name} approved successfully`);
        } catch (error) {
            Alert.alert('Error', 'Failed to approve user');
        } finally {
            setProcessId(null);
        }
    };

    const handleReject = async (id, name) => {
        Alert.alert(
            'Confirm Rejection',
            `Are you sure you want to reject and delete ${name}?`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Reject',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            setProcessId(id);
                            await adminService.rejectUser(id);
                            setUsers(prev => prev.filter(u => u.id !== id));
                        } catch (error) {
                            Alert.alert('Error', 'Failed to reject user');
                        } finally {
                            setProcessId(null);
                        }
                    }
                }
            ]
        );
    };

    const renderItem = ({ item }) => (
        <View style={styles.card}>
            <View style={styles.cardHeader}>
                <View style={styles.avatar}>
                    <User size={20} color={theme.primary} />
                </View>
                <View style={{ flex: 1, marginLeft: 12 }}>
                    <Text style={styles.name}>{item.name || 'No Name'}</Text>
                    <Text style={styles.email}>{item.email || 'No Email'}</Text>
                    {item.mobile && <Text style={styles.mobile}>{item.mobile}</Text>}
                    {item.userId && <Text style={styles.mobile}>ID: {item.userId}</Text>}
                </View>
                <View style={styles.dateTag}>
                    <Clock size={12} color={theme.textSecondary} />
                    <Text style={styles.dateText}>
                        {item.createdAt ? new Date(item.createdAt).toLocaleDateString() : 'N/A'}
                    </Text>
                </View>
            </View>

            <View style={styles.actions}>
                <TouchableOpacity
                    style={[styles.btn, styles.rejectBtn, processId === item.id && { opacity: 0.5 }]}
                    onPress={() => handleReject(item.id, item.name)}
                    disabled={processId === item.id}
                >
                    <X size={18} color={theme.error} />
                    <Text style={[styles.btnText, { color: theme.error }]}>Reject</Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={[styles.btn, styles.approveBtn]}
                    onPress={() => handleApprove(item.id, item.name)}
                    disabled={processId === item.id}
                >
                    {processId === item.id ? (
                        <ActivityIndicator size="small" color="#fff" />
                    ) : (
                        <>
                            <Check size={18} color="#fff" />
                            <Text style={[styles.btnText, { color: '#fff' }]}>Approve</Text>
                        </>
                    )}
                </TouchableOpacity>
            </View>
        </View>
    );

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                    <ArrowLeft size={24} color={theme.textPrimary} />
                </TouchableOpacity>
                <Text style={styles.pageTitle}>Pending Approvals</Text>
            </View>

            {loading ? (
                <View style={styles.center}>
                    <ActivityIndicator size="large" color={theme.primary} />
                </View>
            ) : (
                <FlatList
                    data={users}
                    renderItem={renderItem}
                    keyExtractor={item => item.id}
                    contentContainerStyle={styles.list}
                    refreshControl={<RefreshControl refreshing={loading} onRefresh={loadUsers} tintColor={theme.primary} />}
                    ListEmptyComponent={
                        <View style={styles.emptyState}>
                            <AlertCircle size={40} color={theme.textSecondary} style={{ opacity: 0.5 }} />
                            <Text style={styles.emptyText}>No pending users found</Text>
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

    header: { flexDirection: 'row', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: theme.cardBorder },
    backBtn: { padding: 8, marginRight: 8 },
    pageTitle: { fontSize: 20, fontWeight: '700', color: theme.textPrimary },

    list: { padding: 16 },
    card: { backgroundColor: theme.cardBg, borderRadius: 16, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: theme.cardBorder },
    cardHeader: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 16 },
    avatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: theme.primaryBg, justifyContent: 'center', alignItems: 'center' },
    name: { fontSize: 16, fontWeight: '700', color: theme.textPrimary },
    email: { fontSize: 13, color: theme.textSecondary, marginVertical: 2 },
    mobile: { fontSize: 13, color: theme.textSecondary },

    dateTag: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: theme.background, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
    dateText: { fontSize: 11, color: theme.textSecondary },

    actions: { flexDirection: 'row', gap: 12 },
    btn: { flex: 1, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', padding: 12, borderRadius: 12, gap: 8 },
    rejectBtn: { backgroundColor: 'transparent', borderWidth: 1, borderColor: theme.error },
    approveBtn: { backgroundColor: theme.success },
    btnText: { fontWeight: '600', fontSize: 14 },

    emptyState: { alignItems: 'center', marginTop: 100, gap: 12 },
    emptyText: { color: theme.textSecondary, fontSize: 16 }
});
