package com.enterprise.investmentanalytics.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.util.UUID;
import com.enterprise.investmentanalytics.model.enums.ProfitAccrualStatus;

@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class AdminUserSummary {
    private UUID userId;
    private String name;
    private String email;
    private String bankName;
    private String accountNumber;
    private BigDecimal totalInvested; // Total Credit
    private BigDecimal totalWithdrawn; // Total Debit
    private BigDecimal totalProfit;
    private BigDecimal currentBalance;
    private BigDecimal profitPercentage;
    private ProfitAccrualStatus profitStatus;
}
