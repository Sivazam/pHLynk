
import React from 'react';
import { Page, Text, View, Document, StyleSheet, Image, Font } from '@react-pdf/renderer';
import { formatCurrency, formatTimestampWithTime } from '@/lib/timestamp-utils';
import { LOGO_BASE64 } from '@/constants/assets';

// Define styles
const styles = StyleSheet.create({
    page: {
        flexDirection: 'column',
        backgroundColor: '#FFFFFF',
        padding: 30,
        fontFamily: 'Helvetica',
    },
    header: {
        marginBottom: 20,
        borderBottomWidth: 1,
        borderBottomColor: '#1F2937', // Gray-800
        paddingBottom: 10,
        alignItems: 'center',
    },
    logoContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 10,
    },
    logo: {
        width: 40,
        height: 40,
        marginRight: 10,
    },
    brandName: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#111827', // Gray-900
    },
    tagline: {
        fontSize: 10,
        color: '#4B5563', // Gray-600
    },
    title: {
        fontSize: 12,
        color: '#6B7280', // Gray-500
        marginTop: 5,
        textTransform: 'uppercase',
        letterSpacing: 1,
    },
    section: {
        marginBottom: 20,
        padding: 10,
        backgroundColor: '#F9FAFB', // Gray-50
        borderRadius: 4,
    },
    sectionTitle: {
        fontSize: 14,
        fontWeight: 'bold',
        color: '#111827',
        marginBottom: 10,
        borderBottomWidth: 1,
        borderBottomColor: '#D1D5DB', // Gray-300
        paddingBottom: 5,
    },
    row: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 5,
        fontSize: 10,
    },
    label: {
        color: '#4B5563',
        fontWeight: 'bold',
    },
    value: {
        color: '#111827',
        flex: 1,
        textAlign: 'right',
    },
    amount: {
        color: '#059669', // Green-600
        fontWeight: 'bold',
        fontSize: 14,
    },
    footer: {
        marginTop: 30,
        paddingTop: 10,
        borderTopWidth: 1,
        borderTopColor: '#1F2937',
        alignItems: 'center',
    },
    footerText: {
        fontSize: 10,
        color: '#4B5563',
        marginBottom: 4,
    },
    powerText: {
        fontSize: 8,
        color: '#9CA3AF', // Gray-400
    },
    idText: {
        fontFamily: 'Courier',
        fontSize: 8,
    }
});

interface Payment {
    id: string;
    totalPaid: number;
    method: string;
    createdAt: any;
    lineWorkerId: string;
    lineWorkerName?: string;
    tenantId?: string;
    tenantIds?: string[];
}

interface Retailer {
    name?: string;
    phone?: string;
    address?: string;
    profile?: {
        realName?: string;
        phone?: string;
        address?: string;
    };
}

interface PaymentReceiptPDFProps {
    payment: Payment;
    retailer: Retailer | null;
    wholesalerName: string;
    wholesalerAddress?: string;
    lineWorkerName: string;
}

export const PaymentReceiptPDF = ({
    payment,
    retailer,
    wholesalerName,
    wholesalerAddress,
    lineWorkerName,
}: PaymentReceiptPDFProps) => {
    const getRetailerName = (r: Retailer | null) => r?.profile?.realName || r?.name || 'Unknown Retailer';
    const getRetailerPhone = (r: Retailer | null) => r?.profile?.phone || r?.phone || '';
    const getRetailerAddress = (r: Retailer | null) => r?.profile?.address || r?.address || '';

    return (
        <Document>
            <Page size="A4" style={styles.page}>
                {/* Header */}
                <View style={styles.header}>
                    <View style={styles.logoContainer}>
                        {/* Use the Base64 logo constant */}
                        <Image src={LOGO_BASE64} style={styles.logo} />
                        <Text style={styles.brandName}>PharmaLync</Text>
                    </View>
                    <Text style={styles.tagline}>Verify. Collect. Track.</Text>
                    <Text style={styles.title}>Payment Receipt</Text>
                </View>

                {/* Receipt Info */}
                <View style={styles.section}>
                    <View style={styles.row}>
                        <Text style={styles.label}>Receipt ID:</Text>
                        <Text style={[styles.value, styles.idText]}>{payment.id}</Text>
                    </View>
                    <View style={styles.row}>
                        <Text style={styles.label}>Date & Time:</Text>
                        <Text style={styles.value}>{formatTimestampWithTime(payment.createdAt)}</Text>
                    </View>
                </View>

                {/* Payment Details */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Payment Details</Text>
                    <View style={styles.row}>
                        <Text style={styles.label}>Amount Paid:</Text>
                        <Text style={[styles.value, styles.amount]}>{formatCurrency(payment.totalPaid)}</Text>
                    </View>
                    <View style={styles.row}>
                        <Text style={styles.label}>Payment Method:</Text>
                        <Text style={styles.value}>{payment.method}</Text>
                    </View>
                    <View style={styles.row}>
                        <Text style={styles.label}>Line Worker:</Text>
                        <Text style={styles.value}>{lineWorkerName}</Text>
                    </View>
                    <View style={styles.row}>
                        <Text style={styles.label}>Wholesaler:</Text>
                        <Text style={styles.value}>{wholesalerName}</Text>
                    </View>
                    {wholesalerAddress && (
                        <View style={styles.row}>
                            <Text style={styles.label}>Wholesaler Address:</Text>
                            <Text style={styles.value}>{wholesalerAddress}</Text>
                        </View>
                    )}
                </View>

                {/* Retailer Information */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Retailer Information</Text>
                    <View style={styles.row}>
                        <Text style={styles.label}>Name:</Text>
                        <Text style={styles.value}>{getRetailerName(retailer)}</Text>
                    </View>
                    {getRetailerPhone(retailer) && (
                        <View style={styles.row}>
                            <Text style={styles.label}>Phone:</Text>
                            <Text style={styles.value}>{getRetailerPhone(retailer)}</Text>
                        </View>
                    )}
                    {getRetailerAddress(retailer) && (
                        <View style={styles.row}>
                            <Text style={styles.label}>Address:</Text>
                            <Text style={styles.value}>{getRetailerAddress(retailer)}</Text>
                        </View>
                    )}
                </View>

                {/* Footer */}
                <View style={styles.footer}>
                    <Text style={styles.footerText}>Thank you for your payment!</Text>
                    <Text style={styles.footerText}>This is a computer-generated receipt and does not require a signature.</Text>
                    <Text style={styles.powerText}>Powered by PharmaLync - Your Trusted Pharmacy Management System</Text>
                </View>
            </Page>
        </Document>
    );
};
