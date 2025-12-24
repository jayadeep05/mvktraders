package com.enterprise.investmentanalytics.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.util.List;

@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class DashboardMetrics {
    private BigDecimal totalInvested;
    private BigDecimal totalWithdrawn;
    private BigDecimal totalProfit;
    private BigDecimal currentBalance;
    private List<TransactionResponse> recentTransactions;
    private List<Object> monthlyProfitData; // Placeholder for chart data
    private List<Object> balanceHistory;    // Placeholder for chart data
}
