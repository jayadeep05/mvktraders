package com.enterprise.investmentanalytics.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class ProfitHistoryResponse {
    private UUID id;
    private UUID userId;
    private int month;
    private int year;
    private BigDecimal openingBalance;
    private BigDecimal profitPercentage;
    private BigDecimal profitAmount;
    private BigDecimal closingBalance;
    private boolean isManual;
    private LocalDateTime calculatedAt;
}
