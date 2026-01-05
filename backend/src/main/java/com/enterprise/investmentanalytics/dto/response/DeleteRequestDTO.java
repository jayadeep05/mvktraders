package com.enterprise.investmentanalytics.dto.response;

import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;
import java.util.UUID;

@Data
@Builder
public class DeleteRequestDTO {
    private UUID id;
    private UserSummaryDTO targetUser;
    private UserSummaryDTO requester;
    private String reason;
    private String status;
    private LocalDateTime createdAt;

    @Data
    @Builder
    public static class UserSummaryDTO {
        private UUID id;
        private String name;
        private String email;
        private String role;
    }
}
