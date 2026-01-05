package com.enterprise.investmentanalytics.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.util.UUID;
import java.time.LocalDateTime;

@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class PendingUserDTO {
    private UUID id;
    private String userId;
    private String name;
    private String email;
    private String mobile;
    private String role;
    private String mediatorName;
    private LocalDateTime createdAt;
}
