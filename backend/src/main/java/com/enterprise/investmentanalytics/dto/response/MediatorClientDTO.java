package com.enterprise.investmentanalytics.dto.response;

import com.enterprise.investmentanalytics.model.enums.UserStatus;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class MediatorClientDTO {
    private UUID id;
    private Long sequentialId;
    private String userId;
    private String name;
    private String email;
    private String mobile;
    private UserStatus status;
    private LocalDateTime createdAt;
    private boolean isDeleted;
}
