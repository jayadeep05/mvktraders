package com.enterprise.investmentanalytics.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

import com.enterprise.investmentanalytics.model.enums.ProfitAccrualStatus;

@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class AdminClientSummaryDTO {
    private UUID clientId;
    private String clientName;
    private String email;
    private BigDecimal totalInvested;
    private BigDecimal currentValue;
    private BigDecimal profitOrLoss;
    private Double growthPercentage;
    private LocalDateTime lastUpdated;
    private String userId;
    private String mobile;
    private com.enterprise.investmentanalytics.model.enums.UserStatus status;
    private BigDecimal profitPercentage;
    private ProfitAccrualStatus profitStatus;
    private BigDecimal availableProfit;
    private BigDecimal totalProfitEarned;

}
