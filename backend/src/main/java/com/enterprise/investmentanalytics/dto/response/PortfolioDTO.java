package com.enterprise.investmentanalytics.dto.response;

import com.enterprise.investmentanalytics.model.enums.ProfitAccrualStatus;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PortfolioDTO {
    private UUID id;
    private BigDecimal totalValue;
    private BigDecimal totalInvested;
    private BigDecimal profitPercentage;
    private ProfitAccrualStatus profitAccrualStatus;
    private BigDecimal availableProfit;
    private BigDecimal totalProfitEarned;
    private LocalDateTime updatedAt;
    private com.enterprise.investmentanalytics.model.enums.ProfitMode profitMode;
    private java.time.LocalDate profitModeEffectiveDate;
    private Boolean isProrationEnabled;
    private Boolean allowEarlyExit;
    private String payoutFrequency; // e.g., "1 MONTHS", "2 MINUTES"
    private BigDecimal nextEstimatedPayout;
}
