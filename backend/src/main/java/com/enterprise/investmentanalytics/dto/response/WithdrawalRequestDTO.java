package com.enterprise.investmentanalytics.dto.response;

import com.enterprise.investmentanalytics.model.enums.WithdrawalStatus;
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
public class WithdrawalRequestDTO {
    private UUID id;
    private String userId; // Business identifier (SM...)
    private String userName;
    private String userEmail;
    private BigDecimal amount;
    private WithdrawalStatus status;
    private String rejectionReason;
    private LocalDateTime createdAt;
    private LocalDateTime processedAt;
}
