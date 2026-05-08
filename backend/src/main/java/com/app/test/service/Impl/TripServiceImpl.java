package com.app.test.service.Impl;

import com.app.test.beans.dto.request.TripPlanRequest;
import com.app.test.beans.dto.request.TripRequest;
import com.app.test.beans.dto.response.PageResponse;
import com.app.test.beans.dto.response.TripPlanResponse;
import com.app.test.beans.dto.response.TripResponse;
import com.app.test.beans.dto.response.base.ResponseModelDto;
import com.app.test.model.MsTrip;
import com.app.test.model.MsTripPlan;
import com.app.test.repository.MsTripRepository;
import com.app.test.service.NotificationService;
import com.app.test.service.TripService;
import lombok.extern.log4j.Log4j2;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.Date;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Log4j2
@Service
public class TripServiceImpl implements TripService {

    @Autowired
    private MsTripRepository msTripRepository;

    @Autowired
    private NotificationService notificationService;

    @Override
    public ResponseModelDto<PageResponse<TripResponse>> search(String keyword, int page, int size) {

        try {
            Pageable pageable = PageRequest.of(page, size);
            Page<MsTrip> resultPage;

            if (keyword == null || keyword.trim().isEmpty()) {
                resultPage = msTripRepository.findByRecordStatus('A', pageable);
            } else {
                resultPage = msTripRepository
                        .findByNameContainingIgnoreCaseAndRecordStatusOrDestinationContainingIgnoreCaseAndRecordStatus(
                                keyword,
                                'A',
                                keyword,
                                'A',
                                pageable
                        );
            }

            PageResponse<TripResponse> pageResponse = new PageResponse<>();
            pageResponse.setContent(resultPage.getContent().stream().map(this::mapToResponse).collect(Collectors.toList()));
            pageResponse.setPage(resultPage.getNumber());
            pageResponse.setSize(resultPage.getSize());
            pageResponse.setTotalElements(resultPage.getTotalElements());
            pageResponse.setTotalPages(resultPage.getTotalPages());

            return new ResponseModelDto<>("Success", pageResponse, true);
        } catch (Exception e) {
            return new ResponseModelDto<>("Error", e.getMessage(), null, false);
        }
    }

    @Override
    public ResponseModelDto<TripResponse> getById(String id) {

        try {
            MsTrip entity = findActiveTrip(id);

            if (entity == null) {
                return new ResponseModelDto<>("Failed", "Trip not found", null, false);
            }

            return new ResponseModelDto<>("Success", mapToResponse(entity), true);
        } catch (Exception e) {
            return new ResponseModelDto<>("Error", e.getMessage(), null, false);
        }
    }

    @Override
    public ResponseModelDto<TripResponse> create(TripRequest request) {

        try {
            Date now = new Date();
            MsTrip entity = new MsTrip();
            entity.setId(hasText(request.getId()) ? request.getId() : makeId("trip"));
            entity.setName(request.getName());
            entity.setDestination(request.getDestination());
            entity.setDateRange(request.getDateRange());
            entity.setNotes(request.getNotes());
            entity.setHostUserName(resolveHostUserName(request));
            entity.setAllUsers(Boolean.TRUE.equals(request.getAllUsers()));
            entity.setUsers(mergeUsers(copyUsers(request.getUsers()), entity.getHostUserName()));
            entity.setPendingUsers(copyUsers(request.getPendingUsers()));
            entity.setCreatedBy("Admin");
            entity.setCreatedDate(now);
            entity.setUpdatedBy("Admin");
            entity.setUpdatedDate(now);
            entity.setRecordStatus('A');

            if (request.getPlans() != null) {
                for (TripPlanRequest planRequest : request.getPlans()) {
                    entity.getPlans().add(makePlan(entity, planRequest, now));
                }
            }

            entity = msTripRepository.save(entity);

            return new ResponseModelDto<>("Success", mapToResponse(entity), true);
        } catch (Exception e) {
            return new ResponseModelDto<>("Error", e.getMessage(), null, false);
        }
    }

    @Override
    public ResponseModelDto<TripResponse> update(TripRequest request) {

        try {
            MsTrip entity = findActiveTrip(request.getId());

            if (entity == null) {
                return new ResponseModelDto<>("Failed", "Trip not found", null, false);
            }

            entity.setName(request.getName());
            entity.setDestination(request.getDestination());
            entity.setDateRange(request.getDateRange());
            entity.setNotes(request.getNotes());
            entity.setHostUserName(resolveHostUserName(request, entity));
            entity.setAllUsers(Boolean.TRUE.equals(request.getAllUsers()));
            entity.setUsers(mergeUsers(copyUsers(request.getUsers()), entity.getHostUserName()));
            entity.setUpdatedBy("Admin");
            entity.setUpdatedDate(new Date());

            entity = msTripRepository.save(entity);

            return new ResponseModelDto<>("Success", mapToResponse(entity), true);
        } catch (Exception e) {
            return new ResponseModelDto<>("Error", e.getMessage(), null, false);
        }
    }

    @Override
    public ResponseModelDto<TripResponse> delete(String id) {

        try {
            MsTrip entity = findActiveTrip(id);

            if (entity == null) {
                return new ResponseModelDto<>("Failed", "Trip not found", null, false);
            }

            entity.setRecordStatus('D');
            entity.setUpdatedBy("Admin");
            entity.setUpdatedDate(new Date());

            for (MsTripPlan plan : entity.getPlans()) {
                plan.setRecordStatus('D');
                plan.setUpdatedDate(new Date());
            }

            entity = msTripRepository.save(entity);

            return new ResponseModelDto<>("Success", mapToResponse(entity), true);
        } catch (Exception e) {
            return new ResponseModelDto<>("Error", e.getMessage(), null, false);
        }
    }

    @Override
    public ResponseModelDto<TripResponse> addUser(String tripId, String userName) {

        try {
            MsTrip entity = findActiveTrip(tripId);

            if (entity == null) {
                return new ResponseModelDto<>("Failed", "Trip not found", null, false);
            }

            if (hasText(userName) && !containsIgnoreCase(getTripUsers(entity), userName.trim())) {
                String normalizedUserName = userName.trim();
                getTripUsers(entity).add(normalizedUserName);
                getPendingUsers(entity).removeIf((pendingUser) -> pendingUser.equalsIgnoreCase(normalizedUserName));
                entity.setUpdatedBy("Admin");
                entity.setUpdatedDate(new Date());
                notificationService.create(
                        normalizedUserName,
                        getTripHostUserName(entity),
                        entity.getId(),
                        entity.getName(),
                        "TRIP_INVITE",
                        getTripHostUserName(entity) + " invited you to " + entity.getName()
                );
            }

            entity = msTripRepository.save(entity);

            return new ResponseModelDto<>("Success", mapToResponse(entity), true);
        } catch (Exception e) {
            return new ResponseModelDto<>("Error", e.getMessage(), null, false);
        }
    }

    @Override
    public ResponseModelDto<TripResponse> requestJoin(String tripId, String userName) {

        try {
            MsTrip entity = findActiveTrip(tripId);

            if (entity == null) {
                return new ResponseModelDto<>("Failed", "Trip not found", null, false);
            }

            if (!hasText(userName)) {
                return new ResponseModelDto<>("Failed", "User name is required", null, false);
            }

            String normalizedUserName = userName.trim();

            if (Boolean.TRUE.equals(entity.getAllUsers()) || containsIgnoreCase(getTripUsers(entity), normalizedUserName)) {
                return new ResponseModelDto<>("Success", mapToResponse(entity), true);
            }

            if (!containsIgnoreCase(getPendingUsers(entity), normalizedUserName)) {
                getPendingUsers(entity).add(normalizedUserName);
                entity.setUpdatedBy(normalizedUserName);
                entity.setUpdatedDate(new Date());
                notificationService.create(
                        getTripHostUserName(entity),
                        normalizedUserName,
                        entity.getId(),
                        entity.getName(),
                        "TRIP_JOIN_REQUEST",
                        normalizedUserName + " requested to join " + entity.getName()
                );
            }

            entity = msTripRepository.save(entity);

            return new ResponseModelDto<>("Success", mapToResponse(entity), true);
        } catch (Exception e) {
            return new ResponseModelDto<>("Error", e.getMessage(), null, false);
        }
    }

    @Override
    public ResponseModelDto<TripResponse> addPlan(String tripId, TripPlanRequest request) {

        try {
            MsTrip entity = findActiveTrip(tripId);

            if (entity == null) {
                return new ResponseModelDto<>("Failed", "Trip not found", null, false);
            }

            Date now = new Date();
            entity.getPlans().add(makePlan(entity, request, now));
            entity.setUpdatedBy("Admin");
            entity.setUpdatedDate(now);

            entity = msTripRepository.save(entity);

            return new ResponseModelDto<>("Success", mapToResponse(entity), true);
        } catch (Exception e) {
            return new ResponseModelDto<>("Error", e.getMessage(), null, false);
        }
    }

    @Override
    public ResponseModelDto<TripResponse> updatePlan(String tripId, String planId, TripPlanRequest request) {

        try {
            MsTrip entity = findActiveTrip(tripId);

            if (entity == null) {
                return new ResponseModelDto<>("Failed", "Trip not found", null, false);
            }

            MsTripPlan plan = findActivePlan(entity, planId);

            if (plan == null) {
                return new ResponseModelDto<>("Failed", "Plan not found", null, false);
            }

            applyPlanRequest(plan, request);
            plan.setUpdatedDate(new Date());
            entity.setUpdatedBy("Admin");
            entity.setUpdatedDate(new Date());

            entity = msTripRepository.save(entity);

            return new ResponseModelDto<>("Success", mapToResponse(entity), true);
        } catch (Exception e) {
            return new ResponseModelDto<>("Error", e.getMessage(), null, false);
        }
    }

    @Override
    public ResponseModelDto<TripResponse> deletePlan(String tripId, String planId) {

        try {
            MsTrip entity = findActiveTrip(tripId);

            if (entity == null) {
                return new ResponseModelDto<>("Failed", "Trip not found", null, false);
            }

            entity.getPlans().removeIf(plan -> plan.getId().equals(planId));
            entity.setUpdatedBy("Admin");
            entity.setUpdatedDate(new Date());

            entity = msTripRepository.save(entity);

            return new ResponseModelDto<>("Success", mapToResponse(entity), true);
        } catch (Exception e) {
            return new ResponseModelDto<>("Error", e.getMessage(), null, false);
        }
    }

    private MsTrip findActiveTrip(String id) {
        if (!hasText(id)) {
            return null;
        }

        MsTrip entity = msTripRepository.findById(id).orElse(null);

        if (entity == null || !Character.valueOf('A').equals(entity.getRecordStatus())) {
            return null;
        }

        return entity;
    }

    private MsTripPlan findActivePlan(MsTrip trip, String planId) {
        if (!hasText(planId)) {
            return null;
        }

        return trip.getPlans()
                .stream()
                .filter(plan -> plan.getId().equals(planId) && Character.valueOf('A').equals(plan.getRecordStatus()))
                .findFirst()
                .orElse(null);
    }

    private MsTripPlan makePlan(MsTrip trip, TripPlanRequest request, Date now) {
        MsTripPlan plan = new MsTripPlan();
        plan.setId(hasText(request.getId()) ? request.getId() : makeId("plan"));
        plan.setTrip(trip);
        plan.setCreatedDate(now);
        plan.setUpdatedDate(now);
        plan.setRecordStatus('A');
        applyPlanRequest(plan, request);
        return plan;
    }

    private void applyPlanRequest(MsTripPlan plan, TripPlanRequest request) {
        plan.setDay(request.getDay());
        plan.setTime(request.getTime());
        plan.setDetail(request.getDetail());
        plan.setPlace(request.getPlace());
        plan.setLatitude(request.getLatitude());
        plan.setLongitude(request.getLongitude());
        plan.setGoogleMapUrl(request.getGoogleMapUrl());
        plan.setCompleted(Boolean.TRUE.equals(request.getCompleted()));
    }

    private TripResponse mapToResponse(MsTrip entity) {
        TripResponse response = new TripResponse();
        response.setId(entity.getId());
        response.setName(entity.getName());
        response.setDestination(entity.getDestination());
        response.setDateRange(entity.getDateRange());
        response.setNotes(entity.getNotes());
        response.setHostUserName(getTripHostUserName(entity));
        response.setAllUsers(Boolean.TRUE.equals(entity.getAllUsers()));
        response.setUsers(new ArrayList<>(getTripUsers(entity)));
        response.setPendingUsers(new ArrayList<>(getPendingUsers(entity)));
        response.setPlans(entity.getPlans()
                .stream()
                .filter(plan -> Character.valueOf('A').equals(plan.getRecordStatus()))
                .map(this::mapPlanToResponse)
                .collect(Collectors.toList()));
        return response;
    }

    private TripPlanResponse mapPlanToResponse(MsTripPlan entity) {
        TripPlanResponse response = new TripPlanResponse();
        response.setId(entity.getId());
        response.setDay(entity.getDay());
        response.setTime(entity.getTime());
        response.setDetail(entity.getDetail());
        response.setPlace(entity.getPlace());
        response.setLatitude(entity.getLatitude());
        response.setLongitude(entity.getLongitude());
        response.setGoogleMapUrl(entity.getGoogleMapUrl());
        response.setCompleted(Boolean.TRUE.equals(entity.getCompleted()));
        return response;
    }

    private List<String> copyUsers(List<String> users) {
        if (users == null) {
            return new ArrayList<>();
        }

        return users.stream().filter(this::hasText).map(String::trim).distinct().collect(Collectors.toList());
    }

    private List<String> mergeUsers(List<String> users, String hostUserName) {
        List<String> mergedUsers = new ArrayList<>(users);

        if (hasText(hostUserName) && !containsIgnoreCase(mergedUsers, hostUserName.trim())) {
            mergedUsers.add(0, hostUserName.trim());
        }

        return mergedUsers.stream().filter(this::hasText).map(String::trim).distinct().collect(Collectors.toList());
    }

    private String resolveHostUserName(TripRequest request) {
        if (hasText(request.getHostUserName())) {
            return request.getHostUserName().trim();
        }

        List<String> users = copyUsers(request.getUsers());
        return users.isEmpty() ? "Admin" : users.get(0);
    }

    private String resolveHostUserName(TripRequest request, MsTrip existingTrip) {
        if (hasText(request.getHostUserName())) {
            return request.getHostUserName().trim();
        }

        if (hasText(existingTrip.getHostUserName())) {
            return existingTrip.getHostUserName().trim();
        }

        return getTripHostUserName(existingTrip);
    }

    private String getTripHostUserName(MsTrip entity) {
        if (hasText(entity.getHostUserName())) {
            return entity.getHostUserName().trim();
        }

        if (!getTripUsers(entity).isEmpty()) {
            return getTripUsers(entity).get(0);
        }

        return hasText(entity.getCreatedBy()) ? entity.getCreatedBy().trim() : "Admin";
    }

    private boolean containsIgnoreCase(List<String> users, String userName) {
        if (users == null || !hasText(userName)) {
            return false;
        }

        String normalizedUserName = userName.trim().toLowerCase();
        return users.stream().anyMatch((user) -> hasText(user) && user.trim().toLowerCase().equals(normalizedUserName));
    }

    private String makeId(String prefix) {
        return prefix + "-" + UUID.randomUUID().toString();
    }

    private List<String> getPendingUsers(MsTrip entity) {
        if (entity.getPendingUsers() == null) {
            entity.setPendingUsers(new ArrayList<>());
        }

        return entity.getPendingUsers();
    }

    private List<String> getTripUsers(MsTrip entity) {
        if (entity.getUsers() == null) {
            entity.setUsers(new ArrayList<>());
        }

        return entity.getUsers();
    }

    private boolean hasText(String value) {
        return value != null && !value.trim().isEmpty();
    }
}
