import React, { useState, useContext } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ActivityIndicator, SafeAreaView } from 'react-native';
import Icon from 'react-native-vector-icons/FontAwesome5';
import Config from "./config.json";
import { AuthContext } from '../context/AuthContext';

export default function TransferToken({ navigation }) {
    const { userData } = useContext(AuthContext);
    
    const [receiver, setReceiver] = useState('');
    const [amount, setAmount] = useState('');
    const [privateKey, setPrivateKey] = useState(''); // Người dùng phải nhập Private Key để ký
    const [loading, setLoading] = useState(false);

    const handleTransfer = async () => {
        if (!receiver || !amount || !privateKey) {
            Alert.alert("Lỗi", "Vui lòng nhập đầy đủ thông tin");
            return;
        }

        setLoading(true);
        try {
            const response = await fetch(`${Config.URLAPI}/transfertoken`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    privateKey: privateKey,
                    receiverAddress: receiver,
                    amount: amount
                })
            });

            const data = await response.json();
            
            if (response.ok) {
                Alert.alert("Thành công! 💸", `Đã chuyển ${amount} Token.\nTxHash: ${data.txHash}`);
                navigation.goBack(); // Quay lại màn hình trước
            } else {
                Alert.alert("Thất bại", typeof data === 'string' ? data : "Giao dịch lỗi");
            }
        } catch (error) {
            Alert.alert("Lỗi mạng", "Không thể kết nối đến server");
        } finally {
            setLoading(false);
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()}><Icon name="chevron-left" size={20} /></TouchableOpacity>
                <Text style={styles.headerTitle}>Chuyển Token</Text>
                <View style={{width: 20}} />
            </View>

            <View style={styles.content}>
                <View style={styles.balanceBox}>
                    <Text style={{color:'#555'}}>Ví của bạn:</Text>
                    <Text style={{fontWeight:'bold', marginTop: 5}}>{userData?.walletAddress || "Chưa cập nhật"}</Text>
                </View>

                <Text style={styles.label}>Người nhận (Địa chỉ ví)</Text>
                <TextInput 
                    style={styles.input} 
                    placeholder="0x..." 
                    value={receiver} 
                    onChangeText={setReceiver} 
                />

                <Text style={styles.label}>Số lượng Token (HIVE)</Text>
                <TextInput 
                    style={styles.input} 
                    placeholder="10" 
                    keyboardType="numeric"
                    value={amount} 
                    onChangeText={setAmount} 
                />

                <Text style={styles.label}>Private Key của bạn </Text>
                <TextInput 
                    style={[styles.input, {borderColor: '#e74c3c'}]} 
                    placeholder="Nhập Private Key từ Ganache..." 
                    secureTextEntry={true}
                    value={privateKey} 
                    onChangeText={setPrivateKey} 
                />
                <Text style={styles.note}>* Private Key dùng để xác thực bạn là chủ ví. môi trường Test.</Text>

                <TouchableOpacity style={styles.btnSend} onPress={handleTransfer} disabled={loading}>
                    {loading ? <ActivityIndicator color="#fff" /> : (
                        <>
                            <Icon name="paper-plane" size={16} color="#fff" style={{marginRight: 10}} />
                            <Text style={styles.btnText}>Gửi ngay</Text>
                        </>
                    )}
                </TouchableOpacity>
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#fff' },
    header: { flexDirection: 'row', padding: 20, alignItems: 'center', justifyContent: 'space-between', borderBottomWidth: 1, borderColor: '#eee' },
    headerTitle: { fontSize: 18, fontWeight: 'bold' },
    content: { padding: 20 },
    balanceBox: { backgroundColor: '#f9f9f9', padding: 15, borderRadius: 10, marginBottom: 20 },
    label: { fontWeight: '600', marginBottom: 8, color: '#333' },
    input: { borderWidth: 1, borderColor: '#ddd', borderRadius: 8, padding: 12, marginBottom: 15, fontSize: 16 },
    note: { fontSize: 12, color: '#e74c3c', marginBottom: 20, fontStyle: 'italic' },
    btnSend: { backgroundColor: '#2ecc71', padding: 15, borderRadius: 10, flexDirection: 'row', justifyContent: 'center', alignItems: 'center' },
    btnText: { color: '#fff', fontWeight: 'bold', fontSize: 16 }
});