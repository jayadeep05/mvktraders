package com.enterprise.investmentanalytics.dto.request;

import com.enterprise.investmentanalytics.model.enums.TransactionType;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.util.UUID;

@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class TransactionRequest {
    private UUID userId;
    private TransactionType type;
    private BigDecimal amount;
    private String description;
}
