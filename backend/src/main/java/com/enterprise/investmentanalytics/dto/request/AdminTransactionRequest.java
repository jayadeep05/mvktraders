package com.enterprise.investmentanalytics.dto.request;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class AdminTransactionRequest {
    private BigDecimal amount;
    private String type; // DEPOSIT or WITHDRAWAL
    private String note;
}
