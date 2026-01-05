package com.enterprise.investmentanalytics.dto.response;

import com.enterprise.investmentanalytics.model.enums.RequestStatus;
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
public class DepositRequestDTO {
    private UUID id;
    private UUID userId;
    private String userIdString; // Business ID like "MVK001"
    private String userName;
    private String userEmail;
    private BigDecimal amount;
    private String proofImagePath;
    private String userNote;
    private String adminNote;
    private RequestStatus status;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
