package com.enterprise.investmentanalytics.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ProfitHistoryDTO {
    private int month;
    private int year;
    private BigDecimal profitAmount;
    private BigDecimal profitPercentage;
    private LocalDateTime calculatedAt;
    private BigDecimal openingBalance;
    private BigDecimal closingBalance;
    private String profitMode;
    private boolean isProrated;
}
