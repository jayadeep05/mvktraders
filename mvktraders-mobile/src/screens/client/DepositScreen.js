import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ActivityIndicator, Alert, KeyboardAvoidingView, Platform, ScrollView, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../../context/ThemeContext';
import { ArrowLeft, CheckCircle, Image as ImageIcon, Upload } from 'lucide-react-native';
import { clientService } from '../../api/client';
import * as ImagePicker from 'expo-image-picker';

export default function DepositScreen({ navigation }) {
    const { theme } = useTheme();
    const styles = useMemo(() => getStyles(theme), [theme]);

    const [amount, setAmount] = useState('');
    const [note, setNote] = useState(''); // UTR Number or Transaction Reference
    const [screenshot, setScreenshot] = useState(null);
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);

    const pickImage = async () => {
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            quality: 0.8,
        });

        if (!result.canceled) {
            setScreenshot(result.assets[0]);
        }
    };

    const handleSubmit = async () => {
        if (!amount || isNaN(amount) || parseFloat(amount) <= 0) {
            Alert.alert('Invalid Amount', 'Please enter a valid positive amount.');
            return;
        }

        if (!screenshot) {
            Alert.alert('Screenshot Required', 'Please upload a payment screenshot.');
            return;
        }

        setLoading(true);
        try {
            const formData = new FormData();
            formData.append('amount', parseFloat(amount));
            if (note.trim()) {
                formData.append('note', note);
            }

            // Append screenshot
            const uri = Platform.OS === 'android' ? screenshot.uri : screenshot.uri.replace('file://', '');
            const filename = uri.split('/').pop();
            const match = /\.(\w+)$/.exec(filename);
            const type = match ? `image/${match[1]}` : 'image/jpeg';
            formData.append('screenshot', { uri, name: filename, type });

            await clientService.createDepositRequest(formData);
            setSuccess(true);
        } catch (error) {
            console.error(error);
            Alert.alert('Error', error.response?.data?.message || 'Failed to submit deposit request');
        } finally {
            setLoading(false);
        }
    };

    if (success) {
        return (
            <SafeAreaView style={styles.container}>
                <View style={styles.successContent}>
                    <CheckCircle size={80} color={theme.success} />
                    <Text style={styles.successTitle}>Request Submitted!</Text>
                    <Text style={styles.successText}>
                        Your deposit request for ₹{amount} has been submitted successfully and is pending admin approval.
                    </Text>
                    <TouchableOpacity
                        style={styles.primaryButton}
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
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={{ flex: 1 }}
            >
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                        <ArrowLeft size={24} color={theme.textPrimary} />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>Add Funds</Text>
                    <View style={{ width: 40 }} />
                </View>

                <ScrollView contentContainerStyle={styles.content}>
                    <View style={styles.infoBox}>
                        <Text style={styles.infoTitle}>📋 Instructions</Text>
                        <Text style={styles.infoText}>
                            1. Transfer funds to our account{'\n'}
                            2. Enter the amount below{'\n'}
                            3. Upload payment screenshot{'\n'}
                            4. Submit for approval
                        </Text>
                    </View>

                    <Text style={styles.label}>Amount (₹) *</Text>
                    <TextInput
                        style={styles.input}
                        placeholder="Enter amount"
                        placeholderTextColor={theme.textSecondary}
                        keyboardType="numeric"
                        value={amount}
                        onChangeText={setAmount}
                    />

                    <Text style={styles.label}>Transaction Reference (Optional)</Text>
                    <TextInput
                        style={styles.input}
                        placeholder="UTR Number or Transaction ID"
                        placeholderTextColor={theme.textSecondary}
                        value={note}
                        onChangeText={setNote}
                    />

                    <Text style={styles.label}>Payment Screenshot *</Text>
                    <TouchableOpacity style={styles.imagePicker} onPress={pickImage}>
                        {screenshot ? (
                            <Image source={{ uri: screenshot.uri }} style={styles.previewImage} resizeMode="cover" />
                        ) : (
                            <View style={styles.imagePlaceholder}>
                                <Upload size={32} color={theme.textSecondary} />
                                <Text style={styles.imageText}>Tap to upload screenshot</Text>
                            </View>
                        )}
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[styles.primaryButton, loading && { opacity: 0.7 }]}
                        onPress={handleSubmit}
                        disabled={loading}
                    >
                        {loading ? (
                            <ActivityIndicator color="#fff" />
                        ) : (
                            <Text style={styles.buttonText}>Submit Request</Text>
                        )}
                    </TouchableOpacity>
                </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

const getStyles = (theme) => StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.background },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, borderBottomWidth: 1, borderBottomColor: theme.cardBorder },
    backButton: { padding: 8 },
    headerTitle: { fontSize: 20, fontWeight: '700', color: theme.textPrimary },

    content: { padding: 20 },

    infoBox: { backgroundColor: theme.primaryBg, padding: 16, borderRadius: 12, marginBottom: 24, borderLeftWidth: 4, borderLeftColor: theme.primary },
    infoTitle: { fontSize: 16, fontWeight: '700', color: theme.textPrimary, marginBottom: 8 },
    infoText: { fontSize: 13, color: theme.textSecondary, lineHeight: 20 },

    label: { fontSize: 14, fontWeight: '600', color: theme.textPrimary, marginBottom: 8, marginTop: 16 },
    input: { backgroundColor: theme.cardBg, padding: 14, borderRadius: 12, borderWidth: 1, borderColor: theme.cardBorder, color: theme.textPrimary, fontSize: 16 },

    imagePicker: { height: 200, backgroundColor: theme.cardBg, marginTop: 8, borderRadius: 16, borderWidth: 2, borderColor: theme.cardBorder, borderStyle: 'dashed', justifyContent: 'center', alignItems: 'center', overflow: 'hidden' },
    imagePlaceholder: { alignItems: 'center', gap: 12 },
    imageText: { color: theme.textSecondary, fontWeight: '500', fontSize: 14 },
    previewImage: { width: '100%', height: '100%' },

    primaryButton: { backgroundColor: theme.primary, padding: 16, borderRadius: 16, alignItems: 'center', marginTop: 32, shadowColor: theme.primary, shadowOpacity: 0.3, shadowRadius: 8, elevation: 4 },
    buttonText: { color: '#fff', fontWeight: '700', fontSize: 16 },

    // Success Screen
    successContent: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 },
    successTitle: { fontSize: 28, fontWeight: '700', color: theme.textPrimary, marginTop: 24, marginBottom: 12 },
    successText: { fontSize: 16, color: theme.textSecondary, textAlign: 'center', lineHeight: 24, marginBottom: 32 }
});
