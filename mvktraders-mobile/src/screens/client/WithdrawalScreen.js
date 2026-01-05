import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ActivityIndicator, Alert, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../../context/ThemeContext';
import { ArrowLeft, CheckCircle } from 'lucide-react-native';
import { withdrawalService } from '../../api/client';

export default function WithdrawalScreen({ navigation }) {
    const { theme } = useTheme();
    const styles = useMemo(() => getStyles(theme), [theme]);

    const [amount, setAmount] = useState('');
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);

    const handleSubmit = async () => {
        if (!amount || isNaN(amount) || parseFloat(amount) <= 0) {
            Alert.alert('Invalid Amount', 'Please enter a valid positive amount.');
            return;
        }

        setLoading(true);
        try {
            await withdrawalService.createRequest(parseFloat(amount));
            setSuccess(true);
        } catch (error) {
            console.error(error);
            Alert.alert('Error', error.response?.data?.message || 'Failed to submit withdrawal request');
        } finally {
            setLoading(false);
        }
    };

    if (success) {
        return (
            <SafeAreaView style={styles.container}>
                <View style={styles.successContent}>
                    <CheckCircle size={80} color={theme.error} />
                    <Text style={styles.successTitle}>Request Submitted!</Text>
                    <Text style={styles.successText}>
                        Your withdrawal request for ₹{amount} has been submitted successfully and will be processed shortly.
                    </Text>
                    <TouchableOpacity
                        style={[styles.primaryButton, { backgroundColor: theme.error }]}
                        onPress={() => navigation.goBack()}
                    >
                        <Text style={styles.buttonText}>Back to Dashboard</Text>
                    </TouchableOpacity>
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                    <ArrowLeft size={24} color={theme.headerText} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Withdraw Funds</Text>
                <View style={{ width: 24 }} />
            </View>

            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={{ flex: 1 }}
            >
                <ScrollView contentContainerStyle={styles.content}>
                    <View style={[styles.card, { borderColor: 'rgba(239, 68, 68, 0.3)' }]}>
                        <Text style={styles.label}>AMOUNT TO WITHDRAW (₹)</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="e.g. 10000"
                            placeholderTextColor={theme.textSecondary}
                            keyboardType="numeric"
                            value={amount}
                            onChangeText={setAmount}
                            autoFocus
                        />

                        <View style={[styles.infoBox, { backgroundColor: 'rgba(239, 68, 68, 0.1)', borderColor: 'rgba(239, 68, 68, 0.2)' }]}>
                            <Text style={styles.infoText}>
                                • Funds will be transferred to your registered bank account.
                                {"\n"}• Processing normally takes 24-48 hours.
                                {"\n"}• Ensure your available balance covers this amount.
                            </Text>
                        </View>

                        <TouchableOpacity
                            style={[styles.primaryButton, { marginTop: 30, backgroundColor: theme.error, shadowColor: theme.error }]}
                            onPress={handleSubmit}
                            disabled={loading}
                        >
                            {loading ? (
                                <ActivityIndicator color="#fff" />
                            ) : (
                                <Text style={styles.buttonText}>Submit Request</Text>
                            )}
                        </TouchableOpacity>
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

const getStyles = (theme) => StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: theme.background,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: theme.cardBorder,
    },
    backBtn: {
        padding: 4,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: theme.headerText,
    },
    content: {
        padding: 20,
    },
    card: {
        backgroundColor: theme.cardBg,
        borderRadius: 16,
        padding: 24,
        borderWidth: 1,
        borderColor: theme.inputBorder,
    },
    label: {
        fontSize: 12,
        fontWeight: '700',
        color: theme.textSecondary,
        marginBottom: 8,
        marginTop: 4,
    },
    input: {
        backgroundColor: theme.inputBackground,
        borderWidth: 1,
        borderColor: theme.inputBorder,
        borderRadius: 12,
        padding: 16,
        color: theme.textPrimary,
        fontSize: 16,
    },
    infoBox: {
        marginTop: 24,
        padding: 16,
        borderRadius: 12,
        borderWidth: 1,
    },
    infoText: {
        color: theme.textSecondary,
        fontSize: 13,
        lineHeight: 20,
    },
    primaryButton: {
        height: 52,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 5,
        elevation: 5,
    },
    buttonText: {
        color: '#fff',
        fontWeight: 'bold',
        fontSize: 16,
    },
    successContent: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 40,
    },
    successTitle: {
        fontSize: 24,
        fontWeight: 'bold',
        color: theme.headerText,
        marginTop: 24,
        marginBottom: 12,
    },
    successText: {
        color: theme.textSecondary,
        textAlign: 'center',
        fontSize: 15,
        marginBottom: 40,
        lineHeight: 22,
    }
});
