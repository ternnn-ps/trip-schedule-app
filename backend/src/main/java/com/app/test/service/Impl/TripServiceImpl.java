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
            entity.setAllUsers(Boolean.TRUE.equals(request.getAllUsers()));
            entity.setUsers(copyUsers(request.getUsers()));
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
            entity.setAllUsers(Boolean.TRUE.equals(request.getAllUsers()));
            entity.setUsers(copyUsers(request.getUsers()));
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

            if (hasText(userName) && !entity.getUsers().contains(userName.trim())) {
                entity.getUsers().add(userName.trim());
                entity.setUpdatedBy("Admin");
                entity.setUpdatedDate(new Date());
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

        if (entity == null || entity.getRecordStatus() != 'A') {
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
                .filter(plan -> plan.getId().equals(planId) && plan.getRecordStatus() == 'A')
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
    }

    private TripResponse mapToResponse(MsTrip entity) {
        TripResponse response = new TripResponse();
        response.setId(entity.getId());
        response.setName(entity.getName());
        response.setDestination(entity.getDestination());
        response.setDateRange(entity.getDateRange());
        response.setNotes(entity.getNotes());
        response.setAllUsers(Boolean.TRUE.equals(entity.getAllUsers()));
        response.setUsers(entity.getUsers() == null ? new ArrayList<>() : new ArrayList<>(entity.getUsers()));
        response.setPlans(entity.getPlans()
                .stream()
                .filter(plan -> plan.getRecordStatus() == 'A')
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
        return response;
    }

    private List<String> copyUsers(List<String> users) {
        if (users == null) {
            return new ArrayList<>();
        }

        return users.stream().filter(this::hasText).map(String::trim).distinct().collect(Collectors.toList());
    }

    private String makeId(String prefix) {
        return prefix + "-" + UUID.randomUUID().toString();
    }

    private boolean hasText(String value) {
        return value != null && !value.trim().isEmpty();
    }
}
